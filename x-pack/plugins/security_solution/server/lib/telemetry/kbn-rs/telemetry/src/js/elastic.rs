#![allow(dead_code)]

/// Some code using the elastic crate and exposing it to be used from javascript.
/// Check ../../examples/ to see it in action.
/// Example code:
/// ```javscript
/// const main = async (): Promise<void> => {
//   console.log(">> Start");
//
//   console.log(">> Creating elastic config");
//   const config = new JsElasticConfig("http://localhost:9200", "elastic", "changeme");
//
//   console.log(">> Creating Elastic service");
//   const service = new JsElastic(config);
//
//   console.log(">> Creating telemetry receiver");
//   const receiver = new JsTelemetryReceiver(service);
//
//   console.log(">> Creating index...");
//   await service.createIndex("test_index");
//
//   console.log(">> done! inserting data...");
//   const event = new JsTelemetryModel("1", "abc", 123);
//   let id = await service.index("test_index", event);
//
//   console.log(`>> done! created document with id: ${id} finding data...`);
//   const result = await service.search("test_index");
//
//   console.log(`>> Result: got ${result.length} docs`);
//   result.forEach((doc) => {
//     console.log(`>> doc: ${doc.id} ${doc.name} ${doc.value}`);
//   })
//
//   console.log(">> Adding a few more telemetry events...")
//   for (let i = 20; i < 30; i++) {
//     const event = new JsTelemetryModel(`${i}`, `Event ${i}`, 123 + i);
//     await service.index("test_index", event);
//     console.log(`Done ${i}`);
//   };
//   console.log(">> Done!");
//
//   console.log(">> Searching telemetry documents...");
//   const events = await receiver.findTelemetryEvents("test_index");
//   console.log(`>> Result: got ${events.length} docs`);
//   events.forEach((doc) => {
//     console.log(`>> doc: ${doc.id} ${doc.name} ${doc.value}`);
//   })
//
//
//   console.log(">> done! deleting index...");
//   await service.deleteIndex("test_index");
// }
/// ````
use std::sync::Arc;

use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};

use crate::{
  elastic::model::{Elastic, ElasticConfig},
  telemetry::{TelemetryModel, TelemetryReceiver},
};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(constructor)]
pub struct JsTelemetryModel {
  pub id: String,
  pub name: String,
  pub value: i32,
}

#[napi]
struct JsElasticConfig {
  inner: Box<ElasticConfig>,
}

#[napi]
struct JsElastic {
  inner: Arc<Elastic>,
}

#[napi]
struct JsTelemetryReceiver {
  inner: Box<TelemetryReceiver>,
}

#[napi]
impl JsElasticConfig {
  #[napi(constructor)]
  pub fn new(host: String, username: String, password: String) -> Self {
    let inner = ElasticConfig::new(&host, &username, &password);
    JsElasticConfig {
      inner: Box::new(inner),
    }
  }
}

#[napi]
impl JsElastic {
  #[napi(constructor)]
  pub fn new(config: &JsElasticConfig) -> Self {
    JsElastic {
      inner: Arc::new(Elastic::new(&config.inner)),
    }
  }

  #[napi]
  pub async fn create_index(&self, index: String) -> Result<()> {
    println!("create_index: {}", index);
    self.inner.create_index(&index).await.map_err(|e| {
      println!("Error: {:?}", e);
      napi::Error::new(napi::Status::Unknown, e)
    })?;
    println!("index created!");
    Ok(())
  }

  #[napi]
  pub async fn delete_index(&self, index: String) -> Result<()> {
    self
      .inner
      .delete_index(&index)
      .await
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?;

    Ok(())
  }

  #[napi]
  pub async fn index(&self, index: String, doc: &JsTelemetryModel) -> Result<String> {
    println!("[JsElastic] About to index document {}", doc.id);
    let id = self
      .inner
      .index(&index, doc)
      .await
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?;
    println!("[JsElastic] document {} indexed", doc.id);
    Ok(id)
  }

  #[napi]
  pub async fn search(&self, index: String) -> Result<Vec<JsTelemetryModel>> {
    let result = self
      .inner
      .search(&index)
      .await
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?;

    Ok(result)
  }
}

#[napi]
impl JsTelemetryReceiver {
  #[napi(constructor)]
  pub fn new(elastic: &JsElastic) -> Self {
    let receiver = TelemetryReceiver::new(Arc::clone(&elastic.inner));
    JsTelemetryReceiver {
      inner: Box::new(receiver),
    }
  }

  #[napi]
  pub async fn find_telemetry_events(&self, index: String) -> Result<Vec<JsTelemetryModel>> {
    let result: Vec<_> = self
      .inner
      .find_telemetry_events(index)
      .await
      .map_err(|e| napi::Error::new(napi::Status::Unknown, e))?
      .iter()
      .map(|e| e.into())
      .collect();

    Ok(result)
  }
}

impl From<&TelemetryModel> for JsTelemetryModel {
  fn from(model: &TelemetryModel) -> Self {
    JsTelemetryModel {
      id: model.id.clone(),
      name: model.name.clone(),
      value: model.value,
    }
  }
}
