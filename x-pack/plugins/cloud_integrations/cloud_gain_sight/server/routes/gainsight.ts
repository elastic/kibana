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
export const GAINSIGHT_LIBRARY_PATH = path.join(__dirname, '..', 'assets', 'gainsight_library.js');
export const GAINSIGHT_WIDGET_PATH = path.join(__dirname, '..', 'assets', 'gainsight_widget.js');
export const GAINSIGHT_STYLE_PATH = path.join(__dirname, '..', 'assets', 'gainsight_style.css');

/** @internal exported for testing */
export const renderGainsightLibraryFactory = (dist = true, filePath = GAINSIGHT_LIBRARY_PATH) =>
  once(
    async (): Promise<{
      body: Buffer;
      headers: HttpResponseOptions['headers'];
    }> => {
      const srcBuffer = await fs.readFile(filePath);

      return {
        body: srcBuffer,
        // In dist mode, return a long max-age, otherwise use etag + must-revalidate
        headers: dist
          ? { 'cache-control': `max-age=${DAY * 365}` }
          : { 'cache-control': 'must-revalidate', etag: calculateHash(srcBuffer) },
      };
    }
  );

function calculateHash(srcBuffer: Buffer) {
  const hash = createHash('sha1');
  hash.update(srcBuffer);
  return hash.digest('hex');
}

export const registerGainsightRoute = ({
  httpResources,
  packageInfo,
}: {
  httpResources: HttpResources;
  packageInfo: Readonly<PackageInfo>;
}) => {
  const renderGainsightLibrary = renderGainsightLibraryFactory(
    packageInfo.dist,
    GAINSIGHT_LIBRARY_PATH
  );

  /**
   * Register a custom JS endpoint in order to achieve best caching possible with `max-age` similar to plugin bundles.
   */
  httpResources.register(
    {
      // Use the build number in the URL path to leverage max-age caching on production builds
      path: `/internal/cloud/${packageInfo.buildNum}/gainsight.js`,
      validate: false,
      options: {
        authRequired: false,
      },
    },
    async (context, req, res) => {
      try {
        return res.renderJs(await renderGainsightLibrary());
      } catch (e) {
        return res.customError({
          body: `Could not load Gainsight library from disk due to error: ${e.toString()}`,
          statusCode: 500,
        });
      }
    }
  );
};

export const registerGainsightStyleRoute = ({
  httpResources,
  packageInfo,
}: {
  httpResources: HttpResources;
  packageInfo: Readonly<PackageInfo>;
}) => {
  const renderGainsightLibrary = renderGainsightLibraryFactory(
    packageInfo.dist,
    GAINSIGHT_STYLE_PATH
  );

  /**
   * Register a custom endpoint in order to achieve best caching possible with `max-age` similar to plugin bundles.
   */
  httpResources.register(
    {
      // Use the build number in the URL path to leverage max-age caching on production builds
      path: `/internal/cloud/${packageInfo.buildNum}/gainsight.css`,
      validate: false,
      options: {
        authRequired: false,
      },
    },
    async (context, req, res) => {
      try {
        return res.renderCss(await renderGainsightLibrary());
      } catch (e) {
        return res.customError({
          body: `Could not load Gainsight library from disk due to error: ${e.toString()}`,
          statusCode: 500,
        });
      }
    }
  );
};

export const registerGainsightWidgetRoute = ({
  httpResources,
  packageInfo,
}: {
  httpResources: HttpResources;
  packageInfo: Readonly<PackageInfo>;
}) => {
  const renderGainsightLibrary = renderGainsightLibraryFactory(
    packageInfo.dist,
    GAINSIGHT_WIDGET_PATH
  );

  /**
   * Register a custom JS endpoint in order to achieve best caching possible with `max-age` similar to plugin bundles.
   */
  httpResources.register(
    {
      // Use the build number in the URL path to leverage max-age caching on production builds
      path: `/internal/cloud/${packageInfo.buildNum}/gainsight_widget.js`,
      validate: false,
      options: {
        authRequired: false,
      },
    },
    async (context, req, res) => {
      try {
        return res.renderJs(await renderGainsightLibrary());
      } catch (e) {
        return res.customError({
          body: `Could not load Gainsight library from disk due to error: ${e.toString()}`,
          statusCode: 500,
        });
      }
    }
  );
};
