/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useCallback, useReducer } from 'react';
import { getCaseConfigure, patchCaseConfigure, postCaseConfigure } from './api';

import {
  useStateToaster,
  errorToToaster,
  displaySuccessToast,
} from '../../../common/components/toasters';
import * as i18n from './translations';
import { CasesConfigurationMapping, ClosureType, CaseConfigure, CaseConnector } from './types';
import { ConnectorTypes } from '../../../../../case/common/api/connectors';

export type ConnectorConfiguration = { connector: CaseConnector } & {
  closureType: CaseConfigure['closureType'];
};

export interface State extends ConnectorConfiguration {
  currentConfiguration: ConnectorConfiguration;
  firstLoad: boolean;
  loading: boolean;
  mapping: CasesConfigurationMapping[] | null;
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
      type: 'setMapping';
      mapping: CasesConfigurationMapping[];
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
    case 'setMapping': {
      return {
        ...state,
        mapping: action.mapping,
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
  setMapping: (newMapping: CasesConfigurationMapping[]) => void;
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
  mapping: null,
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

  const setMapping = useCallback((newMapping: CasesConfigurationMapping[]) => {
    dispatch({
      mapping: newMapping,
      type: 'setMapping',
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

  const refetchCaseConfigure = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();

    const fetchCaseConfiguration = async () => {
      try {
        setLoading(true);
        const res = await getCaseConfigure({ signal: abortCtrl.signal });
        if (!didCancel) {
          if (res != null) {
            setConnector(res.connector);
            if (setClosureType != null) {
              setClosureType(res.closureType);
            }
            setVersion(res.version);

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
          }
          setLoading(false);
        }
      } catch (error) {
        if (!didCancel) {
          setLoading(false);
          errorToToaster({
            dispatchToaster,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            title: i18n.ERROR_TITLE,
          });
        }
      }
    };

    fetchCaseConfiguration();

    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.firstLoad]);

  const persistCaseConfigure = useCallback(
    async ({ connector, closureType }: ConnectorConfiguration) => {
      let didCancel = false;
      const abortCtrl = new AbortController();
      const saveCaseConfiguration = async () => {
        try {
          setPersistLoading(true);
          const connectorObj = {
            connector,
            closure_type: closureType,
          };
          const res =
            state.version.length === 0
              ? await postCaseConfigure(connectorObj, abortCtrl.signal)
              : await patchCaseConfigure(
                  {
                    ...connectorObj,
                    version: state.version,
                  },
                  abortCtrl.signal
                );
          if (!didCancel) {
            setConnector(res.connector);
            if (setClosureType) {
              setClosureType(res.closureType);
            }
            setVersion(res.version);
            if (setCurrentConfiguration != null) {
              setCurrentConfiguration({
                closureType: res.closureType,
                connector: {
                  ...res.connector,
                },
              });
            }

            displaySuccessToast(i18n.SUCCESS_CONFIGURE, dispatchToaster);
            setPersistLoading(false);
          }
        } catch (error) {
          if (!didCancel) {
            setPersistLoading(false);
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
          }
        }
      };
      saveCaseConfiguration();
      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.version]
  );

  useEffect(() => {
    refetchCaseConfigure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    refetchCaseConfigure,
    persistCaseConfigure,
    setCurrentConfiguration,
    setConnector,
    setClosureType,
    setMapping,
  };
};
