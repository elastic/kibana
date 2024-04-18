use anyhow::Result;
use telemetry::{
  elastic::model::{Elastic, ElasticConfig},
  telemetry::TelemetryModel,
};

#[tokio::main]
async fn main() -> Result<()> {
  let cfg = ElasticConfig::new("http://localhost:9200", "elastic", "changeme");
  let es = Elastic::new(cfg);

  es.delete_index("telemetry").await?;
  es.create_index("telemetry").await?;

  println!("Creating document");
  let m = TelemetryModel {
    id: "1".to_string(),
    name: "xx".to_string(),
    value: 1,
  };
  let id = es.index("telemetry", m).await?;
  println!("Created document: {:?}", id);

  let items = es.search::<TelemetryModel>("telemetry").await?;
  println!("Got {} items", items.len());
  items.iter().for_each(|item| {
    println!("Item: {:?}", item);
  });

  println!("About to delete document");
  es.delete("telemetry", id).await?;

  println!("Done! searching docs...");
  let items = es.search::<TelemetryModel>("telemetry").await?;
  println!("Got {} items", items.len());

  es.delete_index("telemetry").await?;
  es.create_index("telemetry").await?;

  println!("Bulk indexing documents");
  let items: Vec<TelemetryModel> = (1..=10)
    .map(|i| TelemetryModel {
      id: i.to_string(),
      name: format!("Document {}", i),
      value: i,
    })
    .collect();

  es.bulk_index("telemetry", items).await?;
  println!("Done! searching docs...");
  let items = es.search::<TelemetryModel>("telemetry").await?;
  println!("Got {} items", items.len());
  items.iter().for_each(|item| {
    println!("Item: {:?}", item);
  });

  println!("Deleting all documents");
  es.delete_all("telemetry").await?;

  println!("Done! searching docs...");
  let items = es.search::<TelemetryModel>("telemetry").await?;
  println!("Got {} items", items.len());

  Ok(())
}
