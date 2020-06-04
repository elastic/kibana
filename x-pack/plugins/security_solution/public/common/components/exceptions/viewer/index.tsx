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
  EuiLoadingContent,
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiCodeBlock,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import uuid from 'uuid';

import * as i18n from '../translations';
import { useStateToaster } from '../../toasters';
import { useKibana } from '../../../../common/lib/kibana';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import { ToggleId, RuleExceptionList, ExceptionListItemSchema, ApiProps } from '../types';
import { allExceptionItemsReducer, State } from './reducer';
import {
  useExceptionList,
  deleteExceptionListItemById,
  NamespaceType,
} from '../../../../../public/lists_plugin_deps';
import { ExceptionItem } from './exception_item';
import { AndOrBadge } from '../../and_or_badge';

const StyledText = styled(EuiText)`
  font-style: italic;
  margin: 16px 0;
`;

const OrBadgeWrapper = styled.div`
  .euiBadge {
    margin: 16px 0;
  }
`;

const initialState: State = {
  filterOptions: { filter: '', tags: [] },
  availableListTypes: [],
  selectedListType: ToggleId.DETECTION_ENGINE,
  selectedListId: null,
  selectedListNamespaceType: null,
  endpointList: { id: null, type: null, namespaceType: null },
  detectionsList: { id: null, type: null, namespaceType: null },
  exceptionToEdit: null,
  exceptionToDelete: null,
  isModalOpen: false,
};

enum ModalAction {
  CREATE = 'CREATE',
  EDIT = 'EDIT',
}

interface ExceptionsViewerProps {
  exceptionLists: RuleExceptionList[];
  commentsAccordionId: string;
  onAssociateList?: (listId: string) => void;
}

const ExceptionsViewerComponent = ({
  exceptionLists,
  onAssociateList,
  commentsAccordionId,
}: ExceptionsViewerProps): JSX.Element => {
  const [initLoading, setInitLoading] = useState(true);
  const [
    {
      availableListTypes,
      selectedListType,
      selectedListId,
      selectedListNamespaceType,
      filterOptions,
      isModalOpen,
    },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), initialState);

  // for fetching lists
  const { http } = useKibana().services;
  const [, dispatchToaster] = useStateToaster();
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
  const [loadingList, exceptionList, exceptionItems, fetchList] = useExceptionList({
    http,
    id: selectedListId,
    namespaceType: selectedListNamespaceType,
    filterOptions,
    onError: onDispatchToaster({
      color: 'danger',
      title: i18n.FETCH_LIST_ERROR,
      iconType: 'alert',
    }),
  });

  const setSelectedListType = useCallback(
    (type: ToggleId): void => {
      dispatch({
        type: 'updateSelectedListType',
        listType: type,
      });
    },
    [dispatch]
  );

  const setIsModalOpen = useCallback(
    (isOpen: boolean): void => {
      dispatch({
        type: 'updateModalOpen',
        isOpen,
      });
    },
    [dispatch]
  );

  const setExceptionToDelete = useCallback(
    (id: string | null): void => {
      dispatch({
        type: 'updateExceptionToDelete',
        id,
      });
    },
    [dispatch]
  );

  const onFetchList = useCallback(
    ({ id, namespaceType }: ApiProps): void => {
      if (fetchList != null && id != null && namespaceType != null) {
        fetchList({
          listId: id,
          listNamespaceType: namespaceType,
        });
      }
    },
    [fetchList]
  );

  const onFiltersChange = useCallback(
    (filter: { filter: string; tags: string[] }): void => {
      dispatch({
        type: 'updateFilterOptions',
        filterOptions: filter,
      });
    },
    [dispatch]
  );

  const onAddExceptionItem = useCallback((): void => {
    setIsModalOpen(true);
  }, [setIsModalOpen]);

  const onEditExceptionItem = useCallback(
    (exception: ExceptionListItemSchema): void => {
      dispatch({
        type: 'updateExceptionToEdit',
        exception,
      });

      setIsModalOpen(true);
    },
    [setIsModalOpen]
  );

  const onCloseExceptionModal = useCallback(
    ({ actionType, listId, listNamespaceType }): void => {
      setIsModalOpen(false);

      // TODO: This callback along with fetchList can probably get
      // passed to the modal for it to call itself maybe
      if (actionType === ModalAction.CREATE && listId != null && onAssociateList != null) {
        onAssociateList(listId);
      }

      onFetchList({ id: listId, namespaceType: listNamespaceType });
    },
    [setIsModalOpen, onFetchList, onAssociateList]
  );

  const onDeleteException = useCallback(
    async ({ id, namespaceType }: { id: string; namespaceType: NamespaceType }) => {
      try {
        const deleteTask = new AbortController();
        setExceptionToDelete(id);
        await deleteExceptionListItemById({ http, id, namespaceType, signal: deleteTask.signal });
        setExceptionToDelete(null);

        onFetchList({ id: selectedListId, namespaceType: selectedListNamespaceType });
      } catch (error) {
        onDispatchToaster({
          color: 'danger',
          title: i18n.DELETE_EXCEPTION_ERROR,
          iconType: 'alert',
        });
        setExceptionToDelete(null);
      }
    },
    [
      dispatch,
      http,
      setExceptionToDelete,
      onDispatchToaster,
      selectedListNamespaceType,
      selectedListId,
    ]
  );

  const getListTypes = ({
    detectionsRuleExcList,
    endpointRuleExcList,
  }: {
    detectionsRuleExcList: RuleExceptionList | undefined;
    endpointRuleExcList: RuleExceptionList | undefined;
  }): ToggleId[] => {
    if (detectionsRuleExcList == null) {
      setSelectedListType(ToggleId.ENDPOINT);
      return [ToggleId.ENDPOINT];
    } else if (endpointRuleExcList == null) {
      setSelectedListType(ToggleId.DETECTION_ENGINE);
      return [ToggleId.DETECTION_ENGINE];
    } else {
      setSelectedListType(ToggleId.DETECTION_ENGINE);
      return [ToggleId.DETECTION_ENGINE, ToggleId.ENDPOINT];
    }
  };

  // Logic for initial render
  useEffect((): void => {
    if (initLoading && (exceptionLists.length === 0 || exceptionList != null)) {
      setInitLoading(false);
    }
  }, [initLoading, exceptionLists, loadingList, exceptionList]);

  useEffect((): void => {
    if (exceptionLists.length) {
      const [endpointRuleExcList] = exceptionLists.filter((t) => t.type === ToggleId.ENDPOINT);
      const [detectionsRuleExcList] = exceptionLists.filter(
        (t) => t.type === ToggleId.DETECTION_ENGINE
      );
      const listTypes = getListTypes({ endpointRuleExcList, detectionsRuleExcList });

      dispatch({
        type: 'updateAvailableListTypes',
        listTypes,
        endpointList: endpointRuleExcList ?? null,
        detectionsList: detectionsRuleExcList ?? null,
      });

      setInitLoading(false);
    }
  }, [
    exceptionLists
      .map((t) => t.id)
      .sort()
      .join(),
    dispatch,
  ]);

  const exceptionsSubtext = useMemo((): JSX.Element => {
    if (selectedListType === ToggleId.ENDPOINT) {
      return (
        <FormattedMessage
          id="xpack.siem.exceptions.viewer.exceptionEndpointDetailsDescription"
          defaultMessage="All exceptions to this rule are applied to the endpoint and the detection rule. View {ruleSettings} for more details."
          values={{
            ruleSettings: (
              <EuiLink href={'./'} target="_blank">
                <FormattedMessage
                  id="xpack.siem.exceptions.viewer.exceptionEndpointDetailsDescription.ruleSettingsLink"
                  defaultMessage="rule settings"
                />
              </EuiLink>
            ),
          }}
        />
      );
    } else {
      return (
        <FormattedMessage
          id="xpack.siem.exceptions.viewer.exceptionDetectionDetailsDescription"
          defaultMessage="All exceptions to this rule are applied to the detection rule, not the endpoint. View {ruleSettings} for more details."
          values={{
            ruleSettings: (
              <EuiLink href={'./'} target="_blank">
                <FormattedMessage
                  id="xpack.siem.exceptions.viewer.exceptionDetectionDetailsDescription.ruleSettingsLink"
                  defaultMessage="rule settings"
                />
              </EuiLink>
            ),
          }}
        />
      );
    }
  }, [selectedListType]);

  const exceptions = useMemo(() => {
    if (exceptionItems != null) {
      return exceptionItems.items;
    } else {
      return [];
    }
  }, [exceptionItems]);

  const showEmpty = useMemo((): boolean => {
    return !initLoading && exceptions.length === 0;
  }, [initLoading, exceptions.length]);

  return (
    <>
      {isModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={onCloseExceptionModal}>
            <EuiModalBody>
              <EuiCodeBlock language="json" fontSize="m" paddingSize="m" overflowHeight={300}>
                {JSON.stringify(exceptionList)}
              </EuiCodeBlock>
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}

      <ExceptionsViewerHeader
        isInitLoading={initLoading}
        selectedListType={selectedListType}
        listTypes={availableListTypes}
        onToggleListType={setSelectedListType}
        onFiltersChange={onFiltersChange}
        onAddExceptionClick={onAddExceptionItem}
      />
      <StyledText size="s">{exceptionsSubtext}</StyledText>

      {initLoading && (
        <EuiLoadingContent data-test-subj="initialLoadingAllExceptionItemsView" lines={10} />
      )}

      {showEmpty && (
        <EuiEmptyPrompt
          iconType="advancedSettingsApp"
          title={<h2>{i18n.EXCEPTION_EMPTY_PROMPT_TITLE}</h2>}
          body={<p>{i18n.EXCEPTION_EMPTY_PROMPT_BODY}</p>}
        />
      )}

      {!initLoading &&
        exceptions.length > 0 &&
        exceptions.map((exception, index) => (
          <div key={exception.id}>
            <OrBadgeWrapper>{index !== 0 && <AndOrBadge type="or" />}</OrBadgeWrapper>
            <ExceptionItem
              commentsAccordionId={commentsAccordionId}
              exceptionItem={exception}
              handleDelete={onDeleteException}
              handleEdit={onEditExceptionItem}
            />
          </div>
        ))}
    </>
  );
};

ExceptionsViewerComponent.displayName = 'ExceptionsViewerComponent';

export const ExceptionsViewer = React.memo(ExceptionsViewerComponent);

ExceptionsViewer.displayName = 'ExceptionsViewer';
