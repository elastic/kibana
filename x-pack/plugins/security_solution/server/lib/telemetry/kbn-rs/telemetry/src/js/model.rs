use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[napi(object)]
#[derive(Debug)]
pub struct ClusterData {
  pub cluster_info: ESClusterInfo,
  pub license_info: ESLicense,
}

#[napi(object)]
#[derive(Default, Serialize, Deserialize)]
pub struct EndpointMetadataResult {
  pub processed_endpoints: u32,
}

#[napi(object)]
#[derive(Debug)]
pub struct ESClusterInfo {
  #[napi(js_name = "cluster_uuid")]
  pub cluster_uuid: String,
  #[napi(js_name = "cluster_name")]
  pub cluster_name: String,
  pub version: Option<ESVersion>,
}

#[napi(object)]
#[derive(Debug)]
pub struct ESVersion {
  pub number: String,
  #[napi(js_name = "build_flavor")]
  pub build_flavor: String,
  #[napi(js_name = "build_type")]
  pub build_type: String,
  #[napi(js_name = "build_hash")]
  pub build_hash: String,
  #[napi(js_name = "build_date")]
  pub build_date: String,
  #[napi(js_name = "build_snapshot")]
  pub build_snapshot: Option<bool>,
  #[napi(js_name = "lucene_version")]
  pub lucene_version: String,
  #[napi(js_name = "minimum_wire_compatibility_version")]
  pub minimum_wire_compatibility_version: String,
  #[napi(js_name = "minimum_index_compatibility_version")]
  pub minimum_index_compatibility_version: String,
}

#[napi(object)]
#[derive(Debug)]
pub struct ESLicense {
  pub status: String,
  pub uid: String,
  pub r#type: String,
  #[napi(js_name = "issue_date")]
  pub issue_date: Option<String>,
  #[napi(js_name = "issue_date_in_millis")]
  pub issue_date_in_millis: Option<i32>,
  #[napi(js_name = "expiry_date")]
  pub expiry_date: Option<String>,
  #[napi(js_name = "expiry_date_in_millis")]
  pub expirty_date_in_millis: Option<i32>,
  #[napi(js_name = "max_nodes")]
  pub max_nodes: Option<u32>,
  #[napi(js_name = "issued_to")]
  pub issued_to: Option<String>,
  pub issuer: Option<String>,
  #[napi(js_name = "start_date_in_millis")]
  pub start_date_in_millis: Option<u32>,
}

#[napi(object)]
pub struct EndpointMetricsAbstract {
  pub endpoint_metric_ids: Vec<String>,
  pub total_endpoints: u32,
}

#[napi(object)]
pub struct Agent {
  pub id: String,
  pub version: Option<String>,
}

#[napi(object)]
pub struct Event {
  #[napi(js_name = "agent_id_status")]
  pub agent_id_status: String,
}

#[napi(object)]
pub struct PolicyAction {
  pub name: String,
  pub message: String,
  pub status: String,
}

#[napi(object)]
pub struct Version {
  pub version: String,
}

#[napi(object)]
pub struct Artifact {
  pub global: Version,
}

#[napi(object)]
pub struct Policy {
  pub applied: PolicyApplied,
}

#[napi(object)]
pub struct PolicyApplied {
  pub actions: Vec<PolicyAction>,
  pub artifacts: Artifact,
  pub status: String,
}

#[napi(object)]
pub struct NonPolicyConfiguration {
  pub isolation: bool,
}

#[napi(object)]
pub struct Endpoint {
  pub policy: Option<Policy>,
  pub configuration: Option<NonPolicyConfiguration>,
  pub state: Option<NonPolicyConfiguration>,
  pub capabilities: Option<Vec<String>>,
}

#[napi(object)]
pub struct EndpointPolicyResponseDocument {
  pub agent: Agent,
  pub event: Event,
  #[napi(js_name = "Endpoint")]
  pub endpoint: Endpoint,
}

#[napi(object)]
pub struct Elastic {
  pub agent: Agent,
}

#[napi(object)]
pub struct EndpointMetadataDocument {
  #[napi(js_name = "'@timestamp'")]
  pub timestamp: String,
  pub agent: Agent,
  #[napi(js_name = "Endpoint")]
  pub endpoint: Endpoint,
  pub elastic: Elastic,
}

#[napi(object)]
pub struct PackagePolicy {
  // TODO
  pub id: String,
  // inputs: PackagePolicyInput[];
  pub version: Option<String>,
  pub agents: Option<i32>,
  pub revision: i32,
  // secret_references?: PolicySecretReference[];
  pub updated_at: String,
  pub updated_by: String,
  pub created_at: String,
  pub created_by: String,
}

#[napi(object)]
pub struct PackagePolicyInput {
  pub streams: Vec<PackagePolicyInputStream>,
}

#[napi(object)]
pub struct PackagePolicyInputStream {
  pub id: String,
}

#[napi(object)]
pub struct AgentPolicy {
  pub id: String,
  // TODO pub status: ValueOf<AgentPolicyStatus>;
  pub package_policies: Option<Vec<PackagePolicy>>,
  #[napi(js_name = "is_managed")]
  pub is_managed: bool, // required for created policy
  #[napi(js_name = "updated_at")]
  pub updated_at: String,
  #[napi(js_name = "updated_by")]
  pub updated_by: String,
  pub revision: i32,
  pub agents: Option<i32>,
  #[napi(js_name = "is_protected")]
  pub is_protected: bool,
  #[napi(js_name = "keep_monitoring_alive")]
  pub keep_monitoring_alive: Option<bool>,

  pub name: String,
  pub namespace: String,
  pub description: Option<String>,
  #[napi(js_name = "is_default")]
  pub is_default: Option<bool>,
  #[napi(js_name = "is_default_fleet_server")]
  pub is_default_fleet_server: Option<bool>, // Optional when creating a policy
  #[napi(js_name = "has_fleet_server")]
  pub has_fleet_server: Option<bool>,
  // TODO pub monitoring_enabled?: MonitoringType,
  #[napi(js_name = "unenroll_timeout")]
  pub unenroll_timeout: Option<i32>,
  #[napi(js_name = "inactivity_timeout")]
  pub inactivity_timeout: Option<i32>,
  #[napi(js_name = "is_preconfigured")]
  pub is_preconfigured: Option<bool>,

  // Nullable to allow user to reset to default outputs
  #[napi(js_name = "data_output_id", ts_type = "string | null")]
  pub data_output_id: Option<String>,
  #[napi(
    js_name = "monitoring_output_id",
    ts_type = "string | null | undefined"
  )]
  pub monitoring_output_id: Option<String>,
  #[napi(js_name = "download_source_id", ts_type = "string | null | undefined")]
  pub download_source_id: Option<String>,
  #[napi(
    js_name = "fleet_server_host_id",
    ts_type = "string | null | undefined"
  )]
  pub fleet_server_host_id: Option<String>,
  #[napi(js_name = "schema_version", ts_type = "string | null | undefined")]
  pub schema_version: Option<String>,
  // TODO pub agent_features?: Array<{ name: String, enabled: bool }>,
  // TODO pub overrides?: { [key: String]: any } | null,
  // TODO pub advanced_settings?: { [key: String]: any } | null,
}

#[napi(object)]
pub struct Elasticsearch {
  pub privileges: Privileges,
}

#[napi(object)]
pub struct Privileges {
  pub cluster: Vec<String>,
}

#[napi(object)]
pub struct PackagePolicyPackage {
  pub name: String,
  pub title: String,
  pub version: String,
  #[napi(js_name = "experimental_data_stream_features")]
  pub experimental_data_stream_features: Option<Vec<ExperimentalDataStreamFeature>>,
}

#[napi(object)]
pub struct ExperimentalDataStreamFeature {
  #[napi(js_name = "data_stream")]
  pub data_stream: String,
  pub features: HashMap<String, bool>,
}
