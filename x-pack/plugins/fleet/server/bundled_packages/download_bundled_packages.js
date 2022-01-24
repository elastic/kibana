/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs/promises');
const path = require('path');

const fetch = require('node-fetch');

const EPR_URL = 'https://epr-snapshot.elastic.co';

const BUNDLED_PACKAGES = ['apm', 'elastic_agent', 'endpoint', 'fleet_server', 'synthetics'];

async function downloadBundledPackages() {
  return Promise.all(
    BUNDLED_PACKAGES.map(async (packageName) => {
      // Determine the path of the archive file by searching the package name
      const searchData = await fetch(`${EPR_URL}/search?package=${packageName}`).then((res) =>
        res.json()
      );

      // Fetch the archive file
      const archivePath = searchData[0].download;
      const archiveBuffer = await fetch(`${EPR_URL}/${archivePath}`).then((res) => res.buffer());

      // Write the archive file to disk
      const zipFileName = archivePath.split(`/epr/${packageName}/`)[1].replace('/', '-');
      await fs.writeFile(path.join(__dirname, zipFileName), archiveBuffer);

      console.log(`Wrote file ${zipFileName}`);
    })
  );
}

downloadBundledPackages()
  .then(() =>
    console.log(
      'Done. Remember to clean up any outdated package archives in x-pack/plugins/fleet/server/bundled_packages/'
    )
  )
  .catch((error) => console.error(error));
