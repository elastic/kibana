/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export class LevelLogger {

  static createForServer(server, tags) {
    return new LevelLogger(
      (tags, msg) => server.log(tags, msg),
      tags,
      server.config().get('logging.verbose'));
  }

  constructor(logger, tags, isVerbose) {
    this._logger = logger;
    this._tags = tags;
    this.isVerbose = isVerbose;
  }

  error(msg, tags = []) {
    this._logger([...this._tags, ...tags, 'error'], msg);
  }

  warning(msg, tags = []) {
    this._logger([...this._tags, ...tags, 'warning'], msg);
  }

  debug(msg, tags = []) {
    this._logger([...this._tags, ...tags, 'debug'], msg);
  }

  info(msg, tags = []) {
    this._logger([...this._tags, ...tags, 'info'], msg);
  }

  clone(tags) {
    return new LevelLogger(this._logger, [...this._tags, ...tags], this.isVerbose);
  }
}
