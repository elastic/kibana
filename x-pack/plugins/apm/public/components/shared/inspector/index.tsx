/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { useCurrentRoute } from '@kbn/typed-react-router-config';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { RequestAdapter } from '../../../../../../../src/plugins/inspector/common';
import { InspectorSession } from '../../../../../../../src/plugins/inspector/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmRouter } from '../../../hooks/use_apm_router';

interface InspectorProps {}

export function Inspector({}: InspectorProps) {
  const history = useHistory();
  const inspectorAdapters = { requests: new RequestAdapter() };

  const [route, setRoute] = useState(history.location.pathname);

  useEffect(() => {
    history.listen((location) => {
      setRoute(location.pathname);
      inspectorAdapters.requests.reset();
    });
  }, [history, inspectorAdapters.requests]);

  const { inspector } = useApmPluginContext();
  const [inspectorSession, setInspectorSession] = useState<
    InspectorSession | undefined
  >(undefined);
  const inspect = () => {
    const session = inspector.open(inspectorAdapters, {
      title: route,
    });
    //   data._inspect.forEach((operation) => {
    //     const requestParams = {
    //       id: operation.operationName,
    //       name: operation.operationName,
    //       // Taken from https://github.com/smith/kibana/blob/b1202c2a42a878069350797e70b2950d69d78027/src/plugins/data/common/search/search_source/inspect/inspector_stats.ts#L29
    //       // TODO: Fill in all (or most of) the stats
    //       stats: {
    //         indexPattern: {
    //           label: 'Index pattern',
    //           value: operation.requestParams.index,
    //           description:
    //             'The index pattern that connected to the Elasticsearch indices.',
    //         },
    //       },
    //     };
    //     const requestResponder = inspectorAdapters.requests.start(
    //       operation.operationName,
    //       requestParams
    //     );
    //     requestResponder.json(operation.requestParams.body);
    //     // TODO: Get status as well as data
    //     requestResponder.finish(RequestStatus.OK, { json: operation.response });
    //   });

    setInspectorSession(session);
  };

  return (
    <EuiHeaderLink iconType="inspect" onClick={inspect}>
      Inspect
    </EuiHeaderLink>
  );
}
