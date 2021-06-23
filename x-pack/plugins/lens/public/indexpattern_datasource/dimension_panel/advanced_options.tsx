/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText, EuiPopover, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

export function AdvancedOptions(props: {
  options: Array<{
    title: string;
    dataTestSubj: string;
    onClick: () => void;
    showInPopover: boolean;
    inlineElement: React.ReactElement | null;
  }>;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverOptions = props.options.filter((option) => option.showInPopover);
  const inlineOptions = props.options.filter((option) => option.inlineElement);

  return (
    <>
      {popoverOptions.length > 0 && (
        <EuiText textAlign="right">
          <EuiSpacer size="s" />
          <EuiPopover
            ownFocus
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="arrowDown"
                iconSide="right"
                data-test-subj="indexPattern-advanced-popover"
                onClick={() => {
                  setPopoverOpen(!popoverOpen);
                }}
              >
                {i18n.translate('xpack.lens.indexPattern.advancedSettings', {
                  defaultMessage: 'Add advanced options',
                })}
              </EuiButtonEmpty>
            }
            isOpen={popoverOpen}
            closePopover={() => {
              setPopoverOpen(false);
            }}
          >
            {popoverOptions.map(({ dataTestSubj, onClick, title }, index) => (
              <React.Fragment key={dataTestSubj}>
                <EuiText size="s">
                  <EuiLink
                    data-test-subj={dataTestSubj}
                    color="text"
                    onClick={() => {
                      setPopoverOpen(false);
                      onClick();
                    }}
                  >
                    {title}
                  </EuiLink>
                </EuiText>
                {popoverOptions.length - 1 !== index && <EuiSpacer size="s" />}
              </React.Fragment>
            ))}
          </EuiPopover>
        </EuiText>
      )}
      {inlineOptions.length > 0 && (
        <>
          <EuiSpacer size="s" />
          {inlineOptions.map((option, index) => (
            <React.Fragment key={option.dataTestSubj}>
              {option.inlineElement}
              {index !== inlineOptions.length - 1 && <EuiSpacer size="s" />}
            </React.Fragment>
          ))}
        </>
      )}
    </>
  );
}
