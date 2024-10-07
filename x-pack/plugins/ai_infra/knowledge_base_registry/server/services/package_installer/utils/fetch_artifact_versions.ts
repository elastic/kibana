/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { parseString } from 'xml2js';
import type { ProductName } from '../../../../common/saved_objects';
import { DocumentationProduct } from '../../../../common/consts';

type ArtifactAvailableVersions = Record<ProductName, string[]>;

// TODO: extract to common package
// kibana-kb-elasticsearch-8.15.zip
const artifactNameRegexp = /^kibana-kb-([a-zA-Z]+)-([0-9]+\.[0-9]+)\.zip$/;

export const fetchArtifactVersions = async ({
  artifactRepositoryUrl,
}: {
  artifactRepositoryUrl: string;
}): Promise<ArtifactAvailableVersions> => {
  const res = await fetch(`${artifactRepositoryUrl}?max-keys=1000`);
  const xml = await res.text();
  return new Promise((resolve, reject) => {
    parseString(xml, (err, result: ListBucketResponse) => {
      if (err) {
        reject(err);
      }

      // 6 artifacts per minor stack version means we have a few decades before facing this problem
      if (result.ListBucketResult.IsTruncated?.includes('true')) {
        throw new Error('bucket content is truncated, cannot retrieve all versions');
      }

      const allowedProductNames: ProductName[] = Object.values(DocumentationProduct);

      const record: ArtifactAvailableVersions = {} as ArtifactAvailableVersions;
      allowedProductNames.forEach((product) => {
        record[product] = [];
      });

      result.ListBucketResult.Contents.forEach((contentEntry) => {
        const artifactName = contentEntry.Key[0];
        const match = artifactNameRegexp.exec(artifactName);
        if (match) {
          const productName = match[1].toLowerCase() as ProductName;
          const productVersion = match[2].toLowerCase();
          if (allowedProductNames.includes(productName)) {
            record[productName]!.push(productVersion);
          }
        }
      });

      resolve(record);
    });
  });
};

interface ListBucketResponse {
  ListBucketResult: {
    Name: string[];
    IsTruncated: string[];
    Contents: Array<{ Key: string[] }>;
  };
}
