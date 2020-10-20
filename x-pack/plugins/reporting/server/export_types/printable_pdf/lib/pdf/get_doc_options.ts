/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getDocOptions(tableBorderWidth: number) {
  return {
    tableLayouts: {
      noBorder: {
        // format is function (i, node) { ... };
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      simpleBorder: {
        // format is function (i, node) { ... };
        hLineWidth: () => tableBorderWidth,
        vLineWidth: () => tableBorderWidth,
        hLineColor: () => 'silver',
        vLineColor: () => 'silver',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    },
  };
}
