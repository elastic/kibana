use elasticsearch::Elasticsearch;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct ElasticConfig {
  pub host: String,
  pub username: String,
  pub password: String,
}

pub struct Elastic {
  pub client: Elasticsearch,
}

#[derive(Serialize, Deserialize)]
pub struct ElasticResponse<T> {
  pub took: u32,
  pub timed_out: bool,
  pub hits: Hits<T>,
}

#[derive(Serialize, Deserialize)]
pub struct Hits<T> {
  pub total: Total,
  pub max_score: Option<f32>,
  pub hits: Vec<Hit<T>>,
}

#[derive(Serialize, Deserialize)]
pub struct Hit<T> {
  pub _index: String,
  pub _id: String,
  pub _score: f32,
  pub _source: T,
}

#[derive(Serialize, Deserialize)]
pub struct Total {
  pub value: u32,
  pub relation: String,
}

#[derive(Serialize, Deserialize)]
pub struct ElasticIndexResponse {
  #[serde(rename = "_index")]
  pub index: String,
  #[serde(rename = "_id")]
  pub id: String,
  result: String,
}
