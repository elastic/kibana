/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// type LegacyUrlKeys = 'mlExplorerSwimlane';

// export type AppStateKey =
//   | 'mlSelectSeverity'
//   | 'mlSelectInterval'
//   | 'mlAnomaliesTable'
//   | MlPages
//   | LegacyUrlKeys;

// /**
//  * Hook for managing the URL state of the page.
//  */
// export const usePageUrlState = <PageUrlState extends {}>(
//   pageKey: AppStateKey,
//   defaultState?: PageUrlState
// ): [PageUrlState, (update: Partial<PageUrlState>, replaceState?: boolean) => void] => {
//   const [appState, setAppState] = useUrlState('_a');
//   const pageState = appState?.[pageKey];

//   const resultPageState: PageUrlState = useMemo(() => {
//     return {
//       ...(defaultState ?? {}),
//       ...(pageState ?? {}),
//     };
//   }, [pageState]);

//   const onStateUpdate = useCallback(
//     (update: Partial<PageUrlState>, replaceState?: boolean) => {
//       setAppState(
//         pageKey,
//         {
//           ...resultPageState,
//           ...update,
//         },
//         replaceState
//       );
//     },
//     [pageKey, resultPageState, setAppState]
//   );

//   return useMemo(() => {
//     return [resultPageState, onStateUpdate];
//   }, [resultPageState, onStateUpdate]);
// };
