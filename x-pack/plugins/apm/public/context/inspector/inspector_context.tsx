/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext,ReactNode } from 'react';

interface InspectorContextValue {
    add<T>(data: T) => void;
    inspectorAdapters: { requests: RequestAdapter },
}

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


export const InspectorContext = createContext<InspectorContextValue>({});

export function InspectorContextProvider({children}: {children:ReactNode}) {
    const { inspector } = useApmPluginContext();
    const inspectorAdapters = { requests: new RequestAdapter() };
    const history = useHistory();
    const value: InspectorContextValue = {inspectorAdapters};

    const add = (data
    useEffect(() => {
        history.listen((location) => {
          inspectorAdapters.requests.reset();
        });
      }, [history, inspectorAdapters]);

    return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>
}
