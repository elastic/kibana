/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { isValid } from '../../common/lib/url';
import { missingImage } from '../../common/lib/missing_asset';

/*
 * NOTE: args.dataurl can come as an expression here.
 * For example:
 *   [{"type":"expression","chain":[{"type":"function","function":"asset","arguments":{"_":["..."]}}]}]
 */
export const resolveFromArgs = (args, defaultDataurl = null) => {
  const dataurl = get(args, 'dataurl.0', null);
  return isValid(dataurl) ? dataurl : defaultDataurl;
};

export const resolveWithMissingImage = (img, alt = null) => {
  if (isValid(img)) return img;
  if (img === null) return alt;
  return missingImage;
};
