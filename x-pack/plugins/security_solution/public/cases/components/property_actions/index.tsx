/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPopover, EuiButtonIcon, EuiButtonEmpty } from '@elastic/eui';

import * as i18n from './translations';

export interface PropertyActionButtonProps {
  disabled?: boolean;
  onClick: () => void;
  iconType: string;
  label: string;
}

const ComponentId = 'property-actions';

const PropertyActionButton = React.memo<PropertyActionButtonProps>(
  ({ disabled = false, onClick, iconType, label }) => (
    <EuiButtonEmpty
      data-test-subj={`${ComponentId}-${iconType}`}
      aria-label={label}
      color="text"
      iconSide="left"
      iconType={iconType}
      isDisabled={disabled}
      onClick={onClick}
    >
      {label}
    </EuiButtonEmpty>
  )
);

PropertyActionButton.displayName = 'PropertyActionButton';

export interface PropertyActionsProps {
  propertyActions: PropertyActionButtonProps[];
}

export const PropertyActions = React.memo<PropertyActionsProps>(({ propertyActions }) => {
  const [showActions, setShowActions] = useState(false);

  const onButtonClick = useCallback(() => {
    setShowActions(!showActions);
  }, [showActions]);

  const onClosePopover = useCallback((cb?: () => void) => {
    setShowActions(false);
    if (cb != null) {
      cb();
    }
  }, []);

  return (
    <EuiFlexGroup alignItems="flexStart" data-test-subj={ComponentId} gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downRight"
          ownFocus
          button={
            <EuiButtonIcon
              data-test-subj={`${ComponentId}-ellipses`}
              aria-label={i18n.ACTIONS_ARIA}
              iconType="boxesHorizontal"
              onClick={onButtonClick}
            />
          }
          id="settingsPopover"
          isOpen={showActions}
          closePopover={onClosePopover}
          repositionOnScroll
        >
          <EuiFlexGroup
            alignItems="flexStart"
            data-test-subj={`${ComponentId}-group`}
            direction="column"
            gutterSize="none"
          >
            {propertyActions.map((action, key) => (
              <EuiFlexItem grow={false} key={`${action.label}${key}`}>
                <PropertyActionButton
                  disabled={action.disabled}
                  iconType={action.iconType}
                  label={action.label}
                  onClick={() => onClosePopover(action.onClick)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PropertyActions.displayName = 'PropertyActions';
