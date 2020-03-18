/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFieldText,
  EuiPopover,
} from '@elastic/eui';
import { EnrollmentAPIKey } from '../../../../../../types';

// No need for i18n as these are platform names
const PLATFORMS = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

interface Props {
  kibanaUrl: string;
  kibanaCASha256?: string;
  apiKey: EnrollmentAPIKey;
}

export const ShellEnrollmentInstructions: React.FunctionComponent<Props> = ({
  kibanaUrl,
  kibanaCASha256,
  apiKey,
}) => {
  // Platform state
  const [currentPlatform, setCurrentPlatform] = useState<keyof typeof PLATFORMS>('macos');
  const [isPlatformOptionsOpen, setIsPlatformOptionsOpen] = useState<boolean>(false);

  // Build quick installation command
  const quickInstallInstructions = `${
    kibanaCASha256 ? `CA_SHA256=${kibanaCASha256} ` : ''
  }API_KEY=${
    apiKey.api_key
  } sh -c "$(curl ${kibanaUrl}/api/ingest_manager/fleet/install/${currentPlatform})"`;

  return (
    <>
      <EuiFieldText
        readOnly
        value={quickInstallInstructions}
        fullWidth
        prepend={
          <EuiPopover
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="arrowDown"
                iconSide="right"
                onClick={() => setIsPlatformOptionsOpen(true)}
              >
                {PLATFORMS[currentPlatform]}
              </EuiButtonEmpty>
            }
            isOpen={isPlatformOptionsOpen}
            closePopover={() => setIsPlatformOptionsOpen(false)}
          >
            <EuiContextMenuPanel
              items={Object.entries(PLATFORMS).map(([platform, name]) => (
                <EuiContextMenuItem
                  key={platform}
                  onClick={() => {
                    setCurrentPlatform(platform as typeof currentPlatform);
                    setIsPlatformOptionsOpen(false);
                  }}
                >
                  {name}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        }
        append={
          <EuiCopy textToCopy={quickInstallInstructions}>
            {copy => <EuiButtonEmpty onClick={copy} color="primary" iconType={'copy'} />}
          </EuiCopy>
        }
      />
    </>
  );
};
