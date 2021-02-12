/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiButtonEmpty, EuiPopover, EuiText, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as i18n from './translations';
import { useBasePath } from '../../lib/kibana';

export const IndexPatternInfo = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const button = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={i18n.MORE_INFORMATION}
        iconType="iInCircle"
        onClick={onButtonClick}
      />
    ),
    [onButtonClick]
  );

  return (
    <EuiPopover ownFocus button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText style={{ width: 450 }}>
        <p>
          <small>
            <FormattedMessage
              id="xpack.securitySolution.indexPatterns.colorKey"
              defaultMessage="The {logoKibana} symbol notates a Kibana Index Pattern. Only one Kibana Index Pattern can be selected at a time, while Security Solution index patterns defined in {link} can be selected in multiples."
              values={{
                logoKibana: <EuiIcon type="logoKibana" size="s" />,
                link: (
                  <EuiButtonEmpty
                    href={`${useBasePath()}/app/management/kibana/settings?query=category:(securitySolution)`}
                    iconSide="right"
                    iconType="popout"
                    size="xs"
                    target="_blank"
                  >
                    {i18n.ADVANCED_SETTINGS}
                  </EuiButtonEmpty>
                ),
              }}
            />
          </small>
        </p>
      </EuiText>
    </EuiPopover>
  );
};
