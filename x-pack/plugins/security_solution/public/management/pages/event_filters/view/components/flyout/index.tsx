/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
} from '@elastic/eui';
import { AppAction } from '../../../../../../common/store/actions';
import { EventFiltersForm } from '../form';
import { useEventFiltersSelector, useEventFiltersNotification } from '../../hooks';
import {
  getFormHasError,
  isCreationInProgress,
  isCreationSuccessful,
} from '../../../store/selector';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import { Ecs } from '../../../../../../../common/ecs';
import { useKibana } from '../../../../../../common/lib/kibana';

export interface EventFiltersFlyoutProps {
  type?: 'create' | 'edit';
  id?: string;
  data?: Ecs;
  onCancel(): void;
}

export const EventFiltersFlyout: React.FC<EventFiltersFlyoutProps> = memo(
  ({ onCancel, id, type = 'create', data }) => {
    useEventFiltersNotification();
    const [enrichedData, setEnrichedData] = useState<Ecs | null>();
    const dispatch = useDispatch<Dispatch<AppAction>>();
    const formHasError = useEventFiltersSelector(getFormHasError);
    const creationInProgress = useEventFiltersSelector(isCreationInProgress);
    const creationSuccessful = useEventFiltersSelector(isCreationSuccessful);
    const {
      data: { search },
    } = useKibana().services;

    useEffect(() => {
      if (creationSuccessful) {
        onCancel();
        dispatch({
          type: 'eventFiltersFormStateChanged',
          payload: {
            type: 'UninitialisedResourceState',
          },
        });
      }
    }, [creationSuccessful, onCancel, dispatch]);

    // Initialize the store with the id passed as prop to allow render the form. It acts as componentDidMount
    useEffect(() => {
      const enrichEvent = async () => {
        if (!data || !data._index) return;
        const searchResponse = await search
          .search({
            params: {
              index: data._index,
              body: {
                query: {
                  match: {
                    _id: data._id,
                  },
                },
              },
            },
          })
          .toPromise();

        setEnrichedData({
          ...data,
          host: {
            ...data.host,
            os: {
              ...(data?.host?.os || {}),
              name: [searchResponse.rawResponse.hits.hits[0]._source.host.os.name],
            },
          },
        });
      };

      if (type === 'edit' && !!id) {
        dispatch({
          type: 'eventFiltersInitFromId',
          payload: { id },
        });
      } else if (data) {
        enrichEvent();
      } else {
        dispatch({
          type: 'eventFiltersInitForm',
          payload: { entry: getInitialExceptionFromEvent() },
        });
      }

      return () => {
        dispatch({
          type: 'eventFiltersFormStateChanged',
          payload: {
            type: 'UninitialisedResourceState',
          },
        });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize the store with the enriched event to allow render the form
    useEffect(() => {
      if (enrichedData) {
        dispatch({
          type: 'eventFiltersInitForm',
          payload: { entry: getInitialExceptionFromEvent(enrichedData) },
        });
      }
    }, [dispatch, enrichedData]);

    const handleOnCancel = useCallback(() => {
      if (creationInProgress) return;
      onCancel();
    }, [creationInProgress, onCancel]);

    const confirmButtonMemo = useMemo(
      () => (
        <EuiButton
          data-test-subj="add-exception-confirm-button"
          fill
          disabled={formHasError || creationInProgress || (!!data && !enrichedData)}
          onClick={() =>
            id
              ? dispatch({ type: 'eventFiltersUpdateStart' })
              : dispatch({ type: 'eventFiltersCreateStart' })
          }
          isLoading={creationInProgress}
        >
          {id ? (
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.confirm.update"
              defaultMessage="Update event filter"
            />
          ) : data ? (
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.confirm.update.withData"
              defaultMessage="Add endpoint event filter"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.confirm.create"
              defaultMessage="Add event filter"
            />
          )}
        </EuiButton>
      ),
      [formHasError, creationInProgress, data, enrichedData, id, dispatch]
    );

    return (
      <EuiFlyout size="l" onClose={handleOnCancel} data-test-subj="eventFiltersCreateEditFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              {id ? (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.subtitle.update"
                  defaultMessage="Update event filter"
                />
              ) : data ? (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.title.create.withData"
                  defaultMessage="Add endpoint event filter"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.subtitle.create"
                  defaultMessage="Add event filter"
                />
              )}
            </h2>
          </EuiTitle>
          {data ? (
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.eventFiltersFlyout.subtitle.create.withData"
                defaultMessage="Endpoint security"
              />
            </EuiTextColor>
          ) : null}
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EventFiltersForm allowSelectOs={!data} />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={handleOnCancel}>
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{confirmButtonMemo}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

EventFiltersFlyout.displayName = 'EventFiltersFlyout';
