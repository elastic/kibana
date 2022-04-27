/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';
import { once } from 'lodash';
import { HttpResources, HttpResponseOptions, PackageInfo } from '@kbn/core/server';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** @internal exported for testing */
export const FULLSTORY_LIBRARY_PATH = path.join(__dirname, '..', 'assets', 'fullstory_library.js');

/** @internal exported for testing */
export const renderFullStoryLibraryFactory = (dist = true) =>
  once(
    async (): Promise<{
      body: Buffer;
      headers: HttpResponseOptions['headers'];
    }> => {
      const srcBuffer = await fs.readFile(FULLSTORY_LIBRARY_PATH);
      const hash = createHash('sha1');
      hash.update(srcBuffer);
      const hashDigest = hash.digest('hex');

      return {
        body: srcBuffer,
        // In dist mode, return a long max-age, otherwise use etag + must-revalidate
        headers: dist
          ? { 'cache-control': `max-age=${DAY * 365}` }
          : { 'cache-control': 'must-revalidate', etag: hashDigest },
      };
    }
  );

export const registerFullstoryRoute = ({
  httpResources,
  packageInfo,
}: {
  httpResources: HttpResources;
  packageInfo: Readonly<PackageInfo>;
}) => {
  const renderFullStoryLibrary = renderFullStoryLibraryFactory(packageInfo.dist);

  /**
   * Register a custom JS endpoint in order to acheive best caching possible with `max-age` similar to plugin bundles.
   */
  httpResources.register(
    {
      // Use the build number in the URL path to leverage max-age caching on production builds
      path: `/internal/cloud/${packageInfo.buildNum}/fullstory.js`,
      validate: false,
      options: {
        authRequired: false,
      },
    },
    async (context, req, res) => {
      try {
        return res.renderJs(await renderFullStoryLibrary());
      } catch (e) {
        return res.customError({
          body: `Could not load FullStory library from disk due to error: ${e.toString()}`,
          statusCode: 500,
        });
      }
    }
  );
};
