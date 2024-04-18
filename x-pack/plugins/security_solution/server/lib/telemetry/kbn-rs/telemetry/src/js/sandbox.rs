use std::fmt::Display;

use futures::Future;
use napi::{
  bindgen_prelude::{Function, Promise},
  Env, JsObject, Result,
};
use napi_derive::napi;

/// Call a non-argument function implemented in javscript
/// Example:
///
/// import { call0 } from ...;
///
/// function dummy() {
///   console.log("Hello, world!");
/// }
//
/// call0(dummy);
#[napi]
pub fn call0(callback: Function<(), ()>) -> Result<()> {
  callback.call(())
}

/// Call an async function implemented in javascript with a single argument
/// Example:
///
/// import { call_async } from ...;
///
/// function dummy(value: number) -> Promise<number> {
///   return new Promise((resolve) => {
///   setTimeout(() => resolve(n + 1), 1000)
/// })
//
/// await call_async(dummy, 99); .// returns 100 after 1 sec
#[napi(ts_return_type = "Promise<i32>")]
pub fn call_async(env: Env, cb: Function<i32, Promise<i32>>, value: i32) -> Result<JsObject> {
  let job = cb.call(value);

  // move to another function to deal with `async/await` rust code without
  // napi-related stuff
  env.execute_tokio_future(worker(job?), move |_, v| Ok(v))
}

/// Same as above, but this time call <caller>.<fn_name> instead of the getting the function
/// reference as a parameter.
#[napi(ts_return_type = "Promise<i32>")]
pub fn call_async_on_object(
  env: Env,
  caller: JsObject,
  fn_name: String,
  value: i32,
) -> Result<JsObject> {
  // assume that <caller>.<fn_name> exists as a function returning a Promise<i32>
  // hacky way to interact back with javascript from rust
  let increment_fn = caller.get_named_property::<Function<i32, Promise<i32>>>(&fn_name)?;
  let job = increment_fn.apply(caller, value);

  // move to another function to deal with `async/await` rust code without
  // napi-related stuff
  env.execute_tokio_future(worker(job?), move |_, v| Ok(v))
}

async fn worker<F, R>(job: F) -> Result<R>
where
  F: Future<Output = Result<R>>,
  R: Display,
{
  let result = job.await?;
  println!("[rust] Got: {}", result);
  Ok(result)
}
