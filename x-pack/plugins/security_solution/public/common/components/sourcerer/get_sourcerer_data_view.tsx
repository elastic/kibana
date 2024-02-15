/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useKibana } from '../../lib/kibana';
import type { SourcererScopeName } from '../../store/sourcerer/model';

// TODO: Define what the difference is between this and the sourcererDataView returned
// from useSourcererDataView
export const useGetScopedSourcererDataView = ({
  sourcererScope,
}: {
  sourcererScope: SourcererScopeName;
}) => {
  const {
    services: { fieldFormats },
  } = useKibana();
  const { sourcererDataView } = useSourcererDataView(sourcererScope);

  const dataView = useMemo(() => {
    if (sourcererDataView != null) {
      return new DataView({ spec: sourcererDataView, fieldFormats });
    } else {
      return undefined;
    }
  }, [sourcererDataView, fieldFormats]);

  return dataView;
};
