use std::sync::Arc;

use anyhow::Result;
use serde::{Deserialize, Serialize};

use crate::elastic::model::Elastic;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TelemetryModel {
  pub id: String,
  pub name: String,
  pub value: i32,
}

pub struct TelemetryReceiver {
  elastic: Arc<Elastic>,
}

impl TelemetryReceiver {
  pub fn new(elastic: Arc<Elastic>) -> Self {
    Self {
      elastic: Arc::clone(&elastic),
    }
  }

  pub async fn find_telemetry_events(&self, index: String) -> Result<Vec<TelemetryModel>> {
    self.elastic.search(index).await
  }
}
