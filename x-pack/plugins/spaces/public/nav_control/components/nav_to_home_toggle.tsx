/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiText, EuiToolTip, EuiTourStep } from '@elastic/eui';
import React, { useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { i18n } from '@kbn/i18n';

export const NAV_TO_HOME_TOGGLE_KEY = 'space-nav-to-home-toggle';
export const NAV_TO_HOME_TOGGLE_KEY_TOUR = 'space-nav-to-home-toggle-tour';

export function NavToHomeToggle() {
  const [isOpen, setIsOpen] = useState(() => {
    const initialState = localStorage.getItem(NAV_TO_HOME_TOGGLE_KEY_TOUR);
    return initialState === 'true' || initialState === null;
  });
  const [isOn, setValue] = useLocalStorage<boolean>(NAV_TO_HOME_TOGGLE_KEY, true);

  return (
    <EuiTourStep
      content={
        <EuiText>
          {i18n.translate('xpack.spaces.navControl.navToHomeToggleLabel.help', {
            defaultMessage:
              'Now you can control where you go when you change spaces. You can either go to the home page or return to the same page by toggling this button.',
          })}
        </EuiText>
      }
      isStepOpen={isOpen}
      minWidth={300}
      onFinish={() => {
        setIsOpen(false);
        localStorage.setItem(NAV_TO_HOME_TOGGLE_KEY_TOUR, 'false');
      }}
      step={1}
      stepsTotal={1}
      title="Navigation to home toggle"
      anchorPosition="rightUp"
    >
      <EuiToolTip content={isOn ? NAV_TO_HOME_LABEL : NAV_TO_RETURN_LABEL}>
        <EuiButtonIcon
          size="s"
          data-test-subj="spaceNavToHomeToggle"
          aria-label={isOn ? NAV_TO_HOME_LABEL : NAV_TO_RETURN_LABEL}
          iconType={isOn ? 'home' : 'returnKey'}
          onClick={() => {
            setValue(!isOn);
          }}
        />
      </EuiToolTip>
    </EuiTourStep>
  );
}

const NAV_TO_HOME_LABEL = i18n.translate('xpack.spaces.navControl.navToHomeToggleLabel', {
  defaultMessage: 'Changing space will take you to the home page',
});

const NAV_TO_RETURN_LABEL = i18n.translate('xpack.spaces.navControl.navToReturnLabel', {
  defaultMessage: 'Changing space will return you to same page',
});
