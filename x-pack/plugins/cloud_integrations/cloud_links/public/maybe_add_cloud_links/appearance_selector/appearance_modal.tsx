/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type FC, useState } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { type Value, ValuesGroup } from './values_group';
// import { useAppearance } from './use_appearance_hook';

type ColorMode = 'system' | 'light' | 'dark' | 'space_default';
type Contrast = 'system' | 'normal' | 'high';

const systemLabel = i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalSystemLabel', {
  defaultMessage: 'System',
});

const colorModeOptions: Array<Value<ColorMode>> = [
  {
    id: 'system',
    label: systemLabel,
    icon: 'desktop',
  },
  {
    id: 'light',
    label: i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalLightLabel', {
      defaultMessage: 'Light',
    }),
    icon: 'sun',
  },
  {
    id: 'dark',
    label: i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalDarkLabel', {
      defaultMessage: 'Dark',
    }),
    icon: 'moon',
  },
  {
    id: 'space_default',
    label: i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalSpaceDefaultLabel', {
      defaultMessage: 'Space default',
    }),
    icon: 'spaces',
    betaBadgeLabel: i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalBetaBadgeLabel', {
      defaultMessage: 'Deprecated',
    }),
    betaBadgeTooltipContent: i18n.translate(
      'xpack.cloudLinks.userMenuLinks.appearanceModalBetaBadgeTooltip',
      {
        defaultMessage: 'Space default settings will be deprecated in 10.0.',
      }
    ),
    betaBadgeIconType: 'warning',
  },
];

const contrastOptions: Array<Value<Contrast>> = [
  {
    id: 'system',
    label: systemLabel,
    icon: 'desktop',
  },
  {
    id: 'normal',
    label: i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalNormalLabel', {
      defaultMessage: 'Normal',
    }),
    icon: 'crosshairs',
  },
  {
    id: 'high',
    label: i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalHighLabel', {
      defaultMessage: 'High',
    }),
    icon: 'crosshairs',
  },
];

interface Props {
  closeModal: () => void;
  uiSettingsClient: IUiSettingsClient;
}

export const AppearanceModal: FC<Props> = ({ closeModal, uiSettingsClient }) => {
  const modalTitleId = useGeneratedHtmlId();
  const [colorMode, setColorMode] = useState<ColorMode>('system');
  const [contrast, setContrast] = useState<Contrast>('system');

  // const { isVisible, toggle, isDarkModeOn, colorScheme } = useAppearance({
  //   uiSettingsClient,
  // });

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={closeModal} style={{ width: 600 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle size="m" id={modalTitleId}>
          {i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalTitle', {
            defaultMessage: 'Appearance',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <ValuesGroup<ColorMode>
          title={i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalColorModeTitle', {
            defaultMessage: 'Color mode',
          })}
          values={colorModeOptions}
          selectedValue={colorMode}
          onChange={setColorMode}
          ariaLabel={i18n.translate(
            'xpack.cloudLinks.userMenuLinks.appearanceModalColorModeAriaLabel',
            {
              defaultMessage: 'Appearance color mode',
            }
          )}
        />
        <EuiSpacer />

        {colorMode === 'space_default' && (
          <>
            <EuiCallOut
              title={i18n.translate(
                'xpack.cloudLinks.userMenuLinks.appearanceModalDeprecatedSpaceDefaultTitle',
                {
                  defaultMessage: 'Space default settings will be deprecated in 10.0',
                }
              )}
              color="warning"
              iconType="warning"
            >
              <p>
                {i18n.translate(
                  'xpack.cloudLinks.userMenuLinks.appearanceModalDeprecatedSpaceDefaultDescr',
                  {
                    defaultMessage:
                      'All users with the Space default color mode enabled will be automatically transitioned to the System color mode.',
                  }
                )}
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <ValuesGroup<Contrast>
          title={i18n.translate(
            'xpack.cloudLinks.userMenuLinks.appearanceModalInterfaceContrastTitle',
            {
              defaultMessage: 'Interface contrast',
            }
          )}
          values={contrastOptions}
          selectedValue={contrast}
          onChange={setContrast}
          ariaLabel={i18n.translate(
            'xpack.cloudLinks.userMenuLinks.appearanceModalContrastAriaLabel',
            {
              defaultMessage: 'Appearance contrast',
            }
          )}
        />
        <EuiSpacer />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>
          {i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalDiscardBtnLabel', {
            defaultMessage: 'Discard',
          })}
        </EuiButtonEmpty>

        <EuiButton
          onClick={() => {
            // console.log('close');
          }}
          fill
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceModalSaveBtnLabel', {
            defaultMessage: 'Save changes',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
