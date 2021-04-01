/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useReducer, useRef } from 'react';
import { getCaseConfigure, patchCaseConfigure, postCaseConfigure } from './api';

import {
  useStateToaster,
  errorToToaster,
  displaySuccessToast,
} from '../../../common/components/toasters';
import * as i18n from './translations';
import { ClosureType, CaseConfigure, CaseConnector, CaseConnectorMapping } from './types';
import { ConnectorTypes } from '../../../../../cases/common/api/connectors';

export type ConnectorConfiguration = { connector: CaseConnector } & {
  closureType: CaseConfigure['closureType'];
};

export interface State extends ConnectorConfiguration {
  currentConfiguration: ConnectorConfiguration;
  firstLoad: boolean;
  loading: boolean;
  mappings: CaseConnectorMapping[];
  persistLoading: boolean;
  version: string;
}
export type Action =
  | {
      type: 'setCurrentConfiguration';
      currentConfiguration: ConnectorConfiguration;
    }
  | {
      type: 'setConnector';
      connector: CaseConnector;
    }
  | {
      type: 'setLoading';
      payload: boolean;
    }
  | {
      type: 'setFirstLoad';
      payload: boolean;
    }
  | {
      type: 'setPersistLoading';
      payload: boolean;
    }
  | {
      type: 'setVersion';
      payload: string;
    }
  | {
      type: 'setClosureType';
      closureType: ClosureType;
    }
  | {
      type: 'setMappings';
      mappings: CaseConnectorMapping[];
    };

export const configureCasesReducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'setLoading':
      return {
        ...state,
        loading: action.payload,
      };
    case 'setFirstLoad':
      return {
        ...state,
        firstLoad: action.payload,
      };
    case 'setPersistLoading':
      return {
        ...state,
        persistLoading: action.payload,
      };
    case 'setVersion':
      return {
        ...state,
        version: action.payload,
      };
    case 'setCurrentConfiguration': {
      return {
        ...state,
        currentConfiguration: { ...action.currentConfiguration },
      };
    }
    case 'setConnector': {
      return {
        ...state,
        connector: action.connector,
      };
    }
    case 'setClosureType': {
      return {
        ...state,
        closureType: action.closureType,
      };
    }
    case 'setMappings': {
      return {
        ...state,
        mappings: action.mappings,
      };
    }
    default:
      return state;
  }
};

export interface ReturnUseCaseConfigure extends State {
  persistCaseConfigure: ({ connector, closureType }: ConnectorConfiguration) => unknown;
  refetchCaseConfigure: () => void;
  setClosureType: (closureType: ClosureType) => void;
  setConnector: (connector: CaseConnector) => void;
  setCurrentConfiguration: (configuration: ConnectorConfiguration) => void;
  setMappings: (newMapping: CaseConnectorMapping[]) => void;
}

export const initialState: State = {
  closureType: 'close-by-user',
  connector: {
    fields: null,
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
  },
  currentConfiguration: {
    closureType: 'close-by-user',
    connector: {
      fields: null,
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
    },
  },
  firstLoad: false,
  loading: true,
  mappings: [],
  persistLoading: false,
  version: '',
};

export const useCaseConfigure = (): ReturnUseCaseConfigure => {
  const [state, dispatch] = useReducer(configureCasesReducer, initialState);

  const setCurrentConfiguration = useCallback((configuration: ConnectorConfiguration) => {
    dispatch({
      currentConfiguration: configuration,
      type: 'setCurrentConfiguration',
    });
  }, []);

  const setConnector = useCallback((connector: CaseConnector) => {
    dispatch({
      connector,
      type: 'setConnector',
    });
  }, []);

  const setClosureType = useCallback((closureType: ClosureType) => {
    dispatch({
      closureType,
      type: 'setClosureType',
    });
  }, []);

  const setMappings = useCallback((mappings: CaseConnectorMapping[]) => {
    dispatch({
      mappings,
      type: 'setMappings',
    });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({
      payload: isLoading,
      type: 'setLoading',
    });
  }, []);

  const setFirstLoad = useCallback((isFirstLoad: boolean) => {
    dispatch({
      payload: isFirstLoad,
      type: 'setFirstLoad',
    });
  }, []);

  const setPersistLoading = useCallback((isPersistLoading: boolean) => {
    dispatch({
      payload: isPersistLoading,
      type: 'setPersistLoading',
    });
  }, []);

  const setVersion = useCallback((version: string) => {
    dispatch({
      payload: version,
      type: 'setVersion',
    });
  }, []);

  const [, dispatchToaster] = useStateToaster();
  const isCancelledRefetchRef = useRef(false);
  const abortCtrlRefetchRef = useRef(new AbortController());

  const isCancelledPersistRef = useRef(false);
  const abortCtrlPersistRef = useRef(new AbortController());

  const refetchCaseConfigure = useCallback(async () => {
    try {
      isCancelledRefetchRef.current = false;
      abortCtrlRefetchRef.current.abort();
      abortCtrlRefetchRef.current = new AbortController();

      setLoading(true);
      const res = await getCaseConfigure({ signal: abortCtrlRefetchRef.current.signal });

      if (!isCancelledRefetchRef.current) {
        if (res != null) {
          setConnector(res.connector);
          if (setClosureType != null) {
            setClosureType(res.closureType);
          }
          setVersion(res.version);
          setMappings(res.mappings);

          if (!state.firstLoad) {
            setFirstLoad(true);
            if (setCurrentConfiguration != null) {
              setCurrentConfiguration({
                closureType: res.closureType,
                connector: {
                  ...res.connector,
                },
              });
            }
          }
          if (res.error != null) {
            errorToToaster({
              dispatchToaster,
              error: new Error(res.error),
              title: i18n.ERROR_TITLE,
            });
          }
        }
        setLoading(false);
      }
    } catch (error) {
      if (!isCancelledRefetchRef.current) {
        if (error.name !== 'AbortError') {
          errorToToaster({
            dispatchToaster,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            title: i18n.ERROR_TITLE,
          });
        }
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.firstLoad]);

  const persistCaseConfigure = useCallback(
    async ({ connector, closureType }: ConnectorConfiguration) => {
      try {
        isCancelledPersistRef.current = false;
        abortCtrlPersistRef.current.abort();
        abortCtrlPersistRef.current = new AbortController();
        setPersistLoading(true);

        const connectorObj = {
          connector,
          closure_type: closureType,
        };

        const res =
          state.version.length === 0
            ? await postCaseConfigure(connectorObj, abortCtrlPersistRef.current.signal)
            : await patchCaseConfigure(
                {
                  ...connectorObj,
                  version: state.version,
                },
                abortCtrlPersistRef.current.signal
              );

        if (!isCancelledPersistRef.current) {
          setConnector(res.connector);
          if (setClosureType) {
            setClosureType(res.closureType);
          }
          setVersion(res.version);
          setMappings(res.mappings);
          if (setCurrentConfiguration != null) {
            setCurrentConfiguration({
              closureType: res.closureType,
              connector: {
                ...res.connector,
              },
            });
          }
          if (res.error != null) {
            errorToToaster({
              dispatchToaster,
              error: new Error(res.error),
              title: i18n.ERROR_TITLE,
            });
          }
          displaySuccessToast(i18n.SUCCESS_CONFIGURE, dispatchToaster);
          setPersistLoading(false);
        }
      } catch (error) {
        if (!isCancelledPersistRef.current) {
          if (error.name !== 'AbortError') {
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
          }
          setConnector(state.currentConfiguration.connector);
          setPersistLoading(false);
        }
      }
    },
    [
      dispatchToaster,
      setClosureType,
      setConnector,
      setCurrentConfiguration,
      setMappings,
      setPersistLoading,
      setVersion,
      state,
    ]
  );

  useEffect(() => {
    refetchCaseConfigure();
    return () => {
      isCancelledRefetchRef.current = true;
      abortCtrlRefetchRef.current.abort();
      isCancelledPersistRef.current = true;
      abortCtrlPersistRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    refetchCaseConfigure,
    persistCaseConfigure,
    setCurrentConfiguration,
    setConnector,
    setClosureType,
    setMappings,
  };
};
