/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { BrowserFields } from '../../../../common/containers/source';

import { OnDataProviderEdited } from '../events';
import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';
import { DataProvidersAnd, QueryOperator } from './data_provider';
import { dragAndDropActions } from '../../../../common/store/drag_and_drop';
import { useManageTimeline } from '../../manage_timeline';

interface ProviderItemBadgeProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  register?: DataProvidersAnd;
  timelineId?: string;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  val: string | number;
}

export const ProviderItemBadge = React.memo<ProviderItemBadgeProps>(
  ({
    andProviderId,
    browserFields,
    deleteProvider,
    field,
    kqlQuery,
    isEnabled,
    isExcluded,
    onDataProviderEdited,
    operator,
    providerId,
    register,
    timelineId,
    toggleEnabledProvider,
    toggleExcludedProvider,
    val,
  }) => {
    const { getManageTimelineById } = useManageTimeline();
    const isLoading = useMemo(() => getManageTimelineById(timelineId ?? '').isLoading, [
      getManageTimelineById,
      timelineId,
    ]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const togglePopover = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const onToggleEnabledProvider = useCallback(() => {
      toggleEnabledProvider();
      closePopover();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toggleEnabledProvider]);

    const onToggleExcludedProvider = useCallback(() => {
      toggleExcludedProvider();
      closePopover();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toggleExcludedProvider]);

    const [providerRegistered, setProviderRegistered] = useState(false);

    const dispatch = useDispatch();

    useEffect(() => {
      // optionally register the provider if provided
      if (!providerRegistered && register != null) {
        dispatch(dragAndDropActions.registerProvider({ provider: { ...register, and: [] } }));
        setProviderRegistered(true);
      }
    }, [providerRegistered, dispatch, register, setProviderRegistered]);

    const unRegisterProvider = useCallback(() => {
      if (providerRegistered && register != null) {
        dispatch(dragAndDropActions.unRegisterProvider({ id: register.id }));
      }
    }, [providerRegistered, dispatch, register]);

    useEffect(
      () => () => {
        unRegisterProvider();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    return (
      <ProviderItemActions
        andProviderId={andProviderId}
        browserFields={browserFields}
        button={
          <ProviderBadge
            deleteProvider={!isLoading ? deleteProvider : noop}
            field={field}
            kqlQuery={kqlQuery}
            isEnabled={isEnabled}
            isExcluded={isExcluded}
            providerId={providerId}
            togglePopover={togglePopover}
            val={val}
            operator={operator}
          />
        }
        closePopover={closePopover}
        deleteProvider={deleteProvider}
        field={field}
        kqlQuery={kqlQuery}
        isEnabled={isEnabled}
        isExcluded={isExcluded}
        isLoading={isLoading}
        isOpen={isPopoverOpen}
        onDataProviderEdited={onDataProviderEdited}
        operator={operator}
        providerId={providerId}
        timelineId={timelineId}
        toggleEnabledProvider={onToggleEnabledProvider}
        toggleExcludedProvider={onToggleExcludedProvider}
        value={val}
      />
    );
  }
);

ProviderItemBadge.displayName = 'ProviderItemBadge';
