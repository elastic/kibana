/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('When using FleetFilesClient', () => {
  // FIXME:PT implement test

  it.todo('should create internal ES File client with expected arguments when type is `from-host');

  it.todo('should create internal ES File client with expected arguments when type is `to-host');

  describe('#get() method', () => {
    it.todo('should retrieve file info for files `from-host`');

    it.todo('should retrieve file info for file `to-host`');

    it.todo('should adjust `status` if no data exists for file `from-host`');

    it.todo('should adjust `status` if no data exists for file `to-host`');
  });

  describe('#create() method', () => {
    it.todo('should error is `type` is not `to-host`');

    it.todo('should error if `agentIds` is empty');

    it.todo('should create a new file with expected metadata');

    it.todo('should upload a file and use transform to create hash');

    it.todo('should error if hash was not created');

    it.todo('should return a FleetFile on success');
  });

  describe('#update() method', () => {
    it.todo('should error if `type` is not `to-host`');

    it.todo('should update file with updates provided');

    it.todo('should return a FleetFile on success');
  });

  describe('#delete() method', () => {
    it.todo('should error if `type` is not `to-host`');

    it.todo('should delete file');
  });

  describe('#doesFileHaveData() method', () => {
    it.todo('should search data index for file id');

    it.todo('should return `true` if data exists');

    it.todo('should return `false` if no data exists');
  });

  describe('#downlaod() method', () => {
    it.todo('should should return expected response');

    it.todo('should throw an error if unable to get file record');
  });
});
