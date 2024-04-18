use crate::elastic::model::{ElasticIndexResponse, ElasticResponse};
use anyhow::{bail, Context, Result};
use elasticsearch::http::Url;
use elasticsearch::params::Refresh;
use elasticsearch::{
  auth::Credentials,
  http::transport::{SingleNodeConnectionPool, TransportBuilder},
};
use elasticsearch::{
  indices, BulkOperation, BulkParts, DeleteByQueryParts, DeleteParts, Elasticsearch, IndexParts,
  SearchParts,
};
use serde_json::json;

use super::model::{Elastic, ElasticConfig};

impl Elastic {
  pub fn new(config: &ElasticConfig) -> Self {
    println!("Creating new Elastic instance");
    Self {
      client: Self::es_client(config).unwrap(),
    }
  }

  pub async fn create_index(&self, index: impl Into<String>) -> Result<()> {
    let index = index.into();
    self
      .client
      .indices()
      .create(indices::IndicesCreateParts::Index(&index))
      .send()
      .await
      .with_context(|| format!("Failed to create index: {}", index))?;
    Ok(())
  }

  pub async fn delete_index(&self, index: impl Into<String>) -> Result<()> {
    let index = index.into();
    self
      .client
      .indices()
      .delete(indices::IndicesDeleteParts::Index(&[&index]))
      .send()
      .await
      .with_context(|| format!("Failed to delete index: {}", index))?;
    Ok(())
  }

  pub async fn search<T>(&self, index: impl Into<String>) -> Result<Vec<T>>
  where
    T: serde::de::DeserializeOwned + std::clone::Clone,
  {
    let index = index.into();

    let response = self
      .client
      .search(SearchParts::Index(&[&index]))
      .body(json!({
          "query": {
              "match_all": {}
          }
      }))
      .allow_no_indices(true)
      .send()
      .await
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?;

    let status = response.status_code().as_u16();
    if status != 200 {
      bail!(format!("Failed to query data: {}", status))
    }

    let response = response
      .text()
      .await
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?;

    let items = serde_json::from_str::<ElasticResponse<T>>(&response)
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?
      .hits
      .hits
      .iter()
      .map(|x| x._source.clone())
      .collect::<Vec<T>>();

    Ok(items)
  }

  pub async fn index<T>(&self, index: impl Into<String>, data: T) -> Result<String>
  where
    T: std::fmt::Debug + serde::Serialize,
  {
    self
      .client
      .index(IndexParts::Index(&index.into()))
      .body(data)
      .refresh(Refresh::WaitFor)
      .send()
      .await
      .with_context(|| String::from("Failed to index data"))?
      .json::<ElasticIndexResponse>()
      .await
      .with_context(|| String::from("Failed to deserialize index response"))
      .map(|r| Ok(r.id))?
  }

  pub async fn bulk_index<T>(&self, index: impl Into<String>, data: Vec<T>) -> Result<()>
  where
    T: std::fmt::Debug + serde::Serialize,
  {
    let body: Vec<BulkOperation<_>> = data
      .iter()
      .map(|d| BulkOperation::index(d).into())
      .collect();

    self
      .client
      .bulk(BulkParts::Index(&index.into()))
      .refresh(Refresh::WaitFor)
      .body(body)
      .send()
      .await
      .with_context(|| String::from("Failed to index data"))?;

    Ok(())
  }

  pub async fn delete(&self, index: impl Into<String>, id: impl Into<String>) -> Result<()> {
    self
      .client
      .delete(DeleteParts::IndexId(&index.into(), &id.into()))
      .refresh(Refresh::WaitFor)
      .send()
      .await
      .with_context(|| String::from("Failed to delete data"))?;

    Ok(())
  }

  pub async fn delete_all(&self, index: impl Into<String>) -> Result<()> {
    self
      .client
      .delete_by_query(DeleteByQueryParts::Index(&[&index.into()]))
      .body(json!({
          "query": {
              "match_all": {}
          }
      }))
      .refresh(true)
      .send()
      .await
      .with_context(|| String::from("Failed to delete data"))?;
    Ok(())
  }

  fn es_client(config: &ElasticConfig) -> Result<Elasticsearch> {
    let url = Url::parse(&config.host).map_err(|e| napi::Error::new(napi::Status::Unknown, e))?;
    let conn_pool = SingleNodeConnectionPool::new(url);
    let credentials = Credentials::Basic(config.username.clone(), config.password.clone());
    let transport = TransportBuilder::new(conn_pool)
      .auth(credentials)
      .disable_proxy()
      .build()
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?;

    Ok(Elasticsearch::new(transport))
  }
}

impl ElasticConfig {
  pub fn new(host: &str, username: &str, password: &str) -> Self {
    Self {
      host: host.to_string(),
      username: username.to_string(),
      password: password.to_string(),
    }
  }
}
