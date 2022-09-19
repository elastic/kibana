/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiKeyPadMenuItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLicense } from '../../common/hooks/use_license';
import type { ResponseActionType } from './get_supported_response_actions';
import { useFormData } from '../../shared_imports';

interface IResponseActionsAddButtonProps {
  supportedResponseActionTypes: ResponseActionType[];
  addActionType: () => void;
  updateActionTypeId: (id: string) => void;
}

export const ResponseActionAddButton = ({
  supportedResponseActionTypes,
  addActionType,
  updateActionTypeId,
}: IResponseActionsAddButtonProps) => {
  const [data] = useFormData();
  const [isAddResponseActionButtonShown, setAddResponseActionButtonShown] = useState(
    data.responseActions && data.responseActions.length > 0
  );
  const isGoldLicense = useLicense().isGoldPlus();

  const handleAddActionType = useCallback(
    (item) => {
      setAddResponseActionButtonShown(false);
      addActionType();

      updateActionTypeId(item.id);
    },
    [addActionType, updateActionTypeId]
  );

  const renderAddResponseActionButton = useMemo(() => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            data-test-subj="addAlertActionButton"
            onClick={() => setAddResponseActionButtonShown(false)}
          >
            <FormattedMessage
              id="xpack.securitySolution.sections.actionForm.addResponseActionButtonLabel"
              defaultMessage="Add response action"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  const renderResponseActionTypes = useMemo(() => {
    return (
      supportedResponseActionTypes?.length &&
      supportedResponseActionTypes.map(function (item, index) {
        const keyPadItem = (
          <EuiKeyPadMenuItem
            key={index}
            isDisabled={!isGoldLicense}
            data-test-subj={`${item.id}-ResponseActionTypeSelectOption`}
            label={item.name}
            onClick={() => handleAddActionType(item)}
          >
            <EuiIcon size="xl" type={item.iconClass} />
          </EuiKeyPadMenuItem>
        );

        return (
          <EuiFlexItem grow={false} key={`keypad-${item.id}`}>
            {keyPadItem}
          </EuiFlexItem>
        );
      })
    );
  }, [handleAddActionType, isGoldLicense, supportedResponseActionTypes]);

  if (!supportedResponseActionTypes?.length) return <></>;

  return (
    <>
      {isAddResponseActionButtonShown ? renderAddResponseActionButton : renderResponseActionTypes}
    </>
  );
};
