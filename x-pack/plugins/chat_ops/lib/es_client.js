/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default (server) => {
  const config = server.config();
  const userid = config.get('xpack.chatops.userid');
  const pwd = config.get('xpack.chatops.userpwd');
  const data = userid + ':' + pwd;
  const buff = new Buffer(data);
  const base64data = buff.toString('base64');

  const fakeRequest = {
    headers: {
      authorization: 'Basic ' + base64data },
    // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
    // We use the basePath from the saved job, which we'll have post spaces being implemented;
    // or we use the server base path, which uses the default space
    getBasePath: () => config.get('server.basePath'),
  };

  const savedObjects = server.savedObjects;
  const savedObjectClient =  savedObjects.getScopedSavedObjectsClient(fakeRequest);

  return savedObjectClient;
};
