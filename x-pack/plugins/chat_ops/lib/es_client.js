/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
//import { Client } from 'elasticsearch';
//import { es } from '../config.json';
//import mappings from '../mappings.json';

export default (server) => {
  const config = server.config();
  const userid = config.get('xpack.chatops.userid');
  const pwd = config.get('xpack.chatops.userpwd');
  /*return new Client({ host: 'localhost:9200',
    httpAuth: userid + ':' + pwd
  });*/
  const data = userid + ':' + pwd;
  const buff = new Buffer(data);
  const base64data = buff.toString('base64');

  const fakeRequest = {
    headers: { //'kbn-xsrf': 'test me',
      //httpAuth: userid + ':' + pwd,
      //host: 'localhost:9200',
      authorization: 'Basic ' + base64data },
    // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
    // We use the basePath from the saved job, which we'll have post spaces being implemented;
    // or we use the server base path, which uses the default space
    getBasePath: () => config.get('server.basePath'),
  };

  const savedObjects = server.savedObjects;
  const savedObjectClient =  savedObjects.getScopedSavedObjectsClient(fakeRequest);

  //console.log("saved = " + Object.getOwnPropertyNames(savedObjectClient.client) + " - " + config.get('server.basePath'));
  return savedObjectClient;
};
