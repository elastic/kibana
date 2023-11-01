/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList } from '@elastic/eui';
import type { TileError } from '../../../common/descriptor_types';

interface Props {
  tileErrors: TileError[];
}

export function TileErrorsList(props: Props) {
  const listItems = useMemo(() => {
    return props.tileErrors.map(tileError => {
      return {
        title: i18n.translate('xpack.maps.tileErrorsList.tileTitle', {
          defaultMessage: `Tile {tileZXYKey}`,
          values: { tileZXYKey: tileError.tileZXYKey }
        }),
        description: getDescription(tileError),
      }
    });
  }, [props.tileErrors]);
  return <EuiDescriptionList listItems={listItems} />;
}

function getDescription(tileError: TileError) {
  console.log(tileError);
  if (tileError.error?.root_cause?.[0]?.reason) {
    return tileError.error.root_cause[0].reason;
  }

  if (tileError.error?.reason) {
    return tileError.error.reason;
  }

  return tileError.message;
}
