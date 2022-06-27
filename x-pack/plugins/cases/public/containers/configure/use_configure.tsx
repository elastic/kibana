/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useReducer, useRef } from 'react';
import { getCaseConfigure, patchCaseConfigure, postCaseConfigure } from './api';

import * as i18n from './translations';
import { ClosureType, CaseConfigure, CaseConnector, CaseConnectorMapping } from './types';
import { ConnectorTypes } from '../../../common/api';
import { useToasts } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';

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
  id: string;
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
      type: 'setID';
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
    case 'setID':
      return {
        ...state,
        id: action.payload,
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
  id: '',
};

export const useCaseConfigure = (): ReturnUseCaseConfigure => {
  const { owner } = useCasesContext();
  const [state, dispatch] = useReducer(configureCasesReducer, initialState);
  const toasts = useToasts();
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

  const setID = useCallback((id: string) => {
    dispatch({
      payload: id,
      type: 'setID',
    });
  }, []);

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
      const res = await getCaseConfigure({
        signal: abortCtrlRefetchRef.current.signal,
        owner,
      });

      if (!isCancelledRefetchRef.current) {
        if (res != null) {
          setConnector(res.connector);
          if (setClosureType != null) {
            setClosureType(res.closureType);
          }
          setVersion(res.version);
          setID(res.id);
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
            toasts.addError(new Error(res.error), {
              title: i18n.ERROR_TITLE,
            });
          }
        }
        setLoading(false);
      }
    } catch (error) {
      if (!isCancelledRefetchRef.current) {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
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
            ? await postCaseConfigure(
                // The first owner will be used for case creation
                { ...connectorObj, owner: owner[0] },
                abortCtrlPersistRef.current.signal
              )
            : await patchCaseConfigure(
                state.id,
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
          setID(res.id);
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
            toasts.addError(new Error(res.error), {
              title: i18n.ERROR_TITLE,
            });
          }
          toasts.addSuccess(i18n.SUCCESS_CONFIGURE);
          setPersistLoading(false);
        }
      } catch (error) {
        if (!isCancelledPersistRef.current) {
          if (error.name !== 'AbortError') {
            toasts.addError(
              error.body && error.body.message ? new Error(error.body.message) : error,
              {
                title: i18n.ERROR_TITLE,
              }
            );
          }
          setConnector(state.currentConfiguration.connector);
          setPersistLoading(false);
        }
      }
    },
    [
      setPersistLoading,
      state.version,
      state.id,
      state.currentConfiguration.connector,
      owner,
      setConnector,
      setClosureType,
      setVersion,
      setID,
      setMappings,
      setCurrentConfiguration,
      toasts,
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
