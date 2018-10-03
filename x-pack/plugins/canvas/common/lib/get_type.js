/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function getType(node) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) {
      throw new Error(
        i18n.translate('xpack.canvas.lib.getType.objectsMustHaveTypePropertyErrorMessage', {
          defaultMessage: 'Objects must have a type propery',
        })
      );
    }
    return node.type;
  }

  return typeof node;
}
