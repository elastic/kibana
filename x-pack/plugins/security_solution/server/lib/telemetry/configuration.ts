class TelemetryConfiguration {
  private _telemetry_max_buffer_size = 100;
  private _max_security_list_telemetry_batch = 100;
  private _max_endpoint_telemetry_batch = 300;
  private _max_detection_rule_telemetry_batch = 1_000;
  private _max_detection_alerts_batch = 50;

  get telemetry_max_buffer_size(): number {
    return this._telemetry_max_buffer_size;
  }

  get max_security_list_telemetry_batch(): number {
    return this._max_security_list_telemetry_batch;
  }

  get max_endpoint_telemetry_batch(): number {
    return this._max_endpoint_telemetry_batch;
  }

  get max_detection_rule_telemetry_batch(): number {
    return this._max_detection_rule_telemetry_batch;
  }

  get max_detection_alerts_batch(): number {
    return this._max_detection_alerts_batch;
  }

  set telemetry_max_buffer_size(num: number) {
    this._telemetry_max_buffer_size = num;
  }

  set max_security_list_telemetry_batch(num: number) {
    this._max_security_list_telemetry_batch = num;
  }

  set max_endpoint_telemetry_batch(num: number) {
    this._max_endpoint_telemetry_batch = num;
  }

  set max_detection_rule_telemetry_batch(num: number) {
    this._max_detection_rule_telemetry_batch = num;
  }

  set max_detection_alerts_batch(num: number) {
    this._max_detection_alerts_batch = num;
  }
}

export const telemetryConfiguration = new TelemetryConfiguration();
