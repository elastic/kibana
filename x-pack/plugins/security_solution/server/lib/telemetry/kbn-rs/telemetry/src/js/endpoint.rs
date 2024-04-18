#![allow(unused_variables, unused_imports)]
use std::{any::Any, collections::HashMap, sync::Arc};

use futures::join;
use napi::{bindgen_prelude::*, JsNumber, JsObject, JsUnknown, NapiRaw, Task};
use napi_derive::napi;

use crate::js::model::{
  AgentPolicy, ESClusterInfo, ESLicense, EndpointMetadataDocument, EndpointPolicyResponseDocument,
};

use super::model::{ClusterData, EndpointMetadataResult, EndpointMetricsAbstract};

/// Not a really useful function, just uses the `receiver` javascript service
/// to get ClusterInfo and LicenceInfo and return them as a Promise<ClusterData>
///
/// Only to test how to deal with async javascript code using tokio
#[napi(ts_return_type = "Promise<ClusterData>")]
pub fn fetch_cluster_data(env: Env, receiver: JsObject) -> Result<JsObject> {
  let fetch_cluster =
    get_js_async::<(), ESClusterInfo>(&receiver, "fetchClusterInfo")?.apply(&receiver, ())?;
  let fetch_license =
    get_js_async::<(), ESLicense>(&receiver, "fetchLicenseInfo")?.apply(&receiver, ())?;

  let result = env.execute_tokio_future(
    // TODO improve error handling
    async move {
      let result = join!(fetch_cluster, fetch_license);
      let cluster_info = result.0?;
      let license_info = result.1?;
      let cluster_data = ClusterData {
        cluster_info,
        license_info,
      };
      println!(">> Cluster data {:?}", cluster_data);

      Ok(cluster_data)
    },
    move |_, v| Ok(v),
  )?;

  Ok(result)
}

/// Look up a method in the JS object. The function must returns a Promise<Return>
fn get_js_async<Args: JsValuesTupleIntoVec, Return: FromNapiValue>(
  root: &JsObject,
  fn_name: &str,
) -> Result<Function<'static, Args, Promise<Return>>> {
  root.get_named_property::<Function<Args, Promise<Return>>>(fn_name)
}
