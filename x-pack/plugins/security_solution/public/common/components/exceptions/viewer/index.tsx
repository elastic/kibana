/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useMemo, useEffect, useReducer } from 'react';
import {
  EuiEmptyPrompt,
  EuiText,
  EuiLink,
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import uuid from 'uuid';

import * as i18n from '../translations';
import { useStateToaster } from '../../toasters';
import { useKibana } from '../../../../common/lib/kibana';
import { Panel } from '../../../../common/components/panel';
import { Loader } from '../../../../common/components/loader';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import {
  ExceptionListType,
  ExceptionListItemSchema,
  ApiProps,
  Filter,
  SetExceptionsProps,
} from '../types';
import { allExceptionItemsReducer, State } from './reducer';
import {
  useExceptionList,
  ExceptionIdentifiers,
  useApi,
} from '../../../../../public/lists_plugin_deps';
import { ExceptionItem } from './exception_item';
import { AndOrBadge } from '../../and_or_badge';
import { ExceptionsViewerPagination } from './exceptions_pagination';
import {
  UtilityBar,
  UtilityBarSection,
  UtilityBarGroup,
  UtilityBarText,
  UtilityBarAction,
} from '../../utility_bar';

const StyledText = styled(EuiText)`
  font-style: italic;
`;

const MyExceptionsContainer = styled.div`
  height: 600px;
  overflow: hidden;
`;

const initialState: State = {
  filterOptions: { filter: '', showEndpointList: false, showDetectionsList: false, tags: [] },
  pagination: {
    pageIndex: 0,
    pageSize: 20,
    totalItemCount: 0,
    pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
  },
  endpointList: null,
  detectionsList: null,
  allExceptions: [],
  exceptions: [],
  exceptionToEdit: null,
  loadingItemIds: [],
  isModalOpen: false,
};

enum ModalAction {
  CREATE = 'CREATE',
  EDIT = 'EDIT',
}

interface ExceptionsViewerProps {
  ruleId: string;
  exceptionListsMeta: ExceptionIdentifiers[];
  availableListTypes: ExceptionListType[];
  commentsAccordionId: string;
  onAssociateList?: (listId: string) => void;
}

const ExceptionsViewerComponent = ({
  ruleId,
  exceptionListsMeta,
  availableListTypes,
  onAssociateList,
  commentsAccordionId,
}: ExceptionsViewerProps): JSX.Element => {
  const { services } = useKibana();
  const [, dispatchToaster] = useStateToaster();
  const [initLoading, setInitLoading] = useState(true);
  const onDispatchToaster = useCallback(
    ({ title, color, iconType }) => (): void => {
      dispatchToaster({
        type: 'addToaster',
        toast: {
          id: uuid.v4(),
          title,
          color,
          iconType,
        },
      });
    },
    [dispatchToaster]
  );
  const { deleteExceptionItem } = useApi(services.http);
  const [
    {
      endpointList,
      detectionsList,
      exceptions,
      filterOptions,
      pagination,
      loadingItemIds,
      isModalOpen,
    },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), initialState);

  // TODO: Update icky typing once api updated
  const setExceptions = useCallback(
    ({
      lists: newLists,
      exceptions: newExceptions,
      pagination: newPagination,
    }: SetExceptionsProps) => {
      dispatch({
        type: 'setExceptions',
        lists: newLists,
        exceptions: (newExceptions as unknown) as ExceptionListItemSchema[],
        pagination: newPagination,
      });
    },
    [dispatch]
  );
  const [loadingList, , , , fetchList] = useExceptionList({
    http: services.http,
    lists: exceptionListsMeta,
    filterOptions,
    pagination: {
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      total: pagination.totalItemCount,
    },
    dispatchListsInReducer: setExceptions,
    onError: onDispatchToaster({
      color: 'danger',
      title: i18n.FETCH_LIST_ERROR,
      iconType: 'alert',
    }),
  });

  const setIsModalOpen = useCallback(
    (isOpen: boolean): void => {
      dispatch({
        type: 'updateModalOpen',
        isOpen,
      });
    },
    [dispatch]
  );

  const onFetchList = useCallback((): void => {
    if (fetchList != null) {
      fetchList();
    }
  }, [fetchList]);

  const onFiltersChange = useCallback(
    ({ filter, pagination: pag }: Filter): void => {
      dispatch({
        type: 'updateFilterOptions',
        filterOptions: filter,
        pagination: pag,
      });
    },
    [dispatch]
  );

  const onAddException = useCallback(
    (type: ExceptionListType): void => {
      setIsModalOpen(true);
    },
    [setIsModalOpen]
  );

  const handleEditException = useCallback(
    (exception: ExceptionListItemSchema): void => {
      // TODO: Added this just for testing. Update
      // modal state logic as needed once ready
      dispatch({
        type: 'updateExceptionToEdit',
        exception,
      });

      setIsModalOpen(true);
    },
    [setIsModalOpen]
  );

  const onCloseExceptionModal = useCallback(
    ({ actionType, listId }): void => {
      setIsModalOpen(false);

      // TODO: This callback along with fetchList can probably get
      // passed to the modal for it to call itself maybe
      if (actionType === ModalAction.CREATE && listId != null && onAssociateList != null) {
        onAssociateList(listId);
      }

      onFetchList();
    },
    [setIsModalOpen, onFetchList, onAssociateList]
  );

  const setLoadingItemIds = useCallback(
    (items: ApiProps[]): void => {
      dispatch({
        type: 'updateLoadingItemIds',
        items,
      });
    },
    [dispatch]
  );

  const handleDeleteException = useCallback(
    ({ id, namespaceType }: ApiProps) => {
      deleteExceptionItem({
        id,
        namespaceType,
        onSuccess: () => {
          setLoadingItemIds(loadingItemIds.filter((t) => t.id !== id));
          onFetchList();
        },
        onError: () => {
          const dispatchToasterError = onDispatchToaster({
            color: 'danger',
            title: i18n.DELETE_EXCEPTION_ERROR,
            iconType: 'alert',
          });

          dispatchToasterError();
          setLoadingItemIds(loadingItemIds.filter((t) => t.id !== id));
        },
      });
    },
    [setLoadingItemIds, deleteExceptionItem, loadingItemIds, onFetchList, onDispatchToaster]
  );

  // Logic for initial render
  useEffect((): void => {
    if (initLoading && !loadingList && (exceptions.length === 0 || exceptions != null)) {
      setInitLoading(false);
    }
  }, [initLoading, exceptions, loadingList]);

  const ruleSettingsUrl = useMemo((): string => {
    return services.application.getUrlForApp(
      `security#/detections/rules/id/${encodeURI(ruleId)}/edit`
    );
  }, [ruleId, services.application]);

  const exceptionsSubtext = useMemo((): JSX.Element => {
    if (filterOptions.showEndpointList) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.exceptions.viewer.exceptionEndpointDetailsDescription"
          defaultMessage="All exceptions to this rule are applied to the endpoint and the detection rule. View {ruleSettings} for more details."
          values={{
            ruleSettings: (
              <EuiLink href={ruleSettingsUrl} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.exceptions.viewer.exceptionEndpointDetailsDescription.ruleSettingsLink"
                  defaultMessage="rule settings"
                />
              </EuiLink>
            ),
          }}
        />
      );
    } else if (filterOptions.showDetectionsList) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.exceptions.viewer.exceptionDetectionDetailsDescription"
          defaultMessage="All exceptions to this rule are applied to the detection rule, not the endpoint. View {ruleSettings} for more details."
          values={{
            ruleSettings: (
              <EuiLink href={ruleSettingsUrl} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.exceptions.viewer.exceptionDetectionDetailsDescription.ruleSettingsLink"
                  defaultMessage="rule settings"
                />
              </EuiLink>
            ),
          }}
        />
      );
    } else {
      return <></>;
    }
  }, [filterOptions.showEndpointList, filterOptions.showDetectionsList, ruleSettingsUrl]);

  const showEmpty = useMemo((): boolean => {
    return !initLoading && !loadingList && exceptions.length === 0;
  }, [initLoading, exceptions.length, loadingList]);

  return (
    <>
      {isModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={onCloseExceptionModal}>
            <EuiModalBody>
              <EuiCodeBlock language="json" fontSize="m" paddingSize="m" overflowHeight={300}>
                {`Modal goes here`}
              </EuiCodeBlock>
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}

      <Panel loading={initLoading}>
        {initLoading && <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />}

        <ExceptionsViewerHeader
          isInitLoading={initLoading}
          supportedListTypes={availableListTypes}
          detectionsListItems={detectionsList != null ? detectionsList.totalItems : 0}
          endpointListItems={endpointList != null ? endpointList.totalItems : 0}
          onFilterChange={onFiltersChange}
          onAddExceptionClick={onAddException}
        />

        {(filterOptions.showEndpointList || filterOptions.showDetectionsList) && (
          <>
            <EuiSpacer size="xs" />
            <StyledText size="s">{exceptionsSubtext}</StyledText>
          </>
        )}

        <EuiSpacer size="l" />

        <UtilityBar>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText dataTestSubj="showingRules">
                {i18n.SHOWING_EXCEPTIONS(pagination.totalItemCount ?? 0)}
              </UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconSide="left" iconType="refresh" onClick={onFetchList}>
                {i18n.REFRESH}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>

        <EuiSpacer size="s" />

        <MyExceptionsContainer className="eui-yScrollWithShadows">
          {showEmpty && (
            <EuiEmptyPrompt
              iconType="advancedSettingsApp"
              title={<h2>{i18n.EXCEPTION_EMPTY_PROMPT_TITLE}</h2>}
              body={<p>{i18n.EXCEPTION_EMPTY_PROMPT_BODY}</p>}
              data-test-subj="exceptionsEmptyPrompt"
            />
          )}

          <EuiSpacer size="s" />

          <EuiFlexGroup direction="column" className="eui-yScrollWithShadows">
            {!initLoading &&
              exceptions.length > 0 &&
              exceptions.map((exception, index) => (
                <EuiFlexItem grow={false} key={exception.id}>
                  {index !== 0 && (
                    <>
                      <AndOrBadge type="or" />
                      <EuiSpacer />
                    </>
                  )}
                  <ExceptionItem
                    loadingItemIds={loadingItemIds}
                    commentsAccordionId={commentsAccordionId}
                    exceptionItem={exception}
                    onDeleteException={handleDeleteException}
                    onEditException={handleEditException}
                  />
                </EuiFlexItem>
              ))}
          </EuiFlexGroup>
        </MyExceptionsContainer>
        <ExceptionsViewerPagination onPaginationChange={onFiltersChange} pagination={pagination} />
      </Panel>
    </>
  );
};

ExceptionsViewerComponent.displayName = 'ExceptionsViewerComponent';

export const ExceptionsViewer = React.memo(ExceptionsViewerComponent);

ExceptionsViewer.displayName = 'ExceptionsViewer';
