/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, ComponentType, useMemo } from 'react';
import type { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { CommonProps, EuiPanel, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';
import classNames from 'classnames';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

const COMMAND_EXECUTION_RESULT_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.commandExecutionResult.successTitle',
  { defaultMessage: 'Command successful.' }
);
const COMMAND_EXECUTION_RESULT_FAILURE_TITLE = i18n.translate(
  'xpack.securitySolution.commandExecutionResult.failureTitle',
  { defaultMessage: 'Command failed.' }
);
const COMMAND_EXECUTION_RESULT_PENDING = i18n.translate(
  'xpack.securitySolution.commandExecutionResult.pending',
  { defaultMessage: 'Waiting for response' }
);

export type CommandExecutionResultProps = PropsWithChildren<{
  /**
   * Default is `success`.
   *
   * **IMPORTANT**: Note that when `pending` is used, the `title` will NOT be shown - only `children`.
   *                Also,
   *                The element output to DOM will be `inline-block`, allowing for messages
   *                to be displayed after the loading/busy indicator.
   */
  showAs?: 'success' | 'failure' | 'pending';

  /** Default title message are provided depending based on the value for `showAs` */
  title?: ReactNode;

  /** If the title should be shown. Default is true */
  showTitle?: boolean;

  className?: CommonProps['className'];

  'data-test-subj'?: string;
}>;

/**
 * A component that can be used by consumers of the Console to format the result of a command.
 * Applies consistent structure, colors and formatting, and includes ability to set a title and
 * whether the result is a success or failure.
 */
export const CommandExecutionResult = memo<CommandExecutionResultProps>(
  ({
    showAs = 'success',
    title,
    showTitle = true,
    'data-test-subj': dataTestSubj,
    className,
    children,
  }) => {
    const consoleDataTestSubj = useDataTestSubj();
    const getTestId = useTestIdGenerator(dataTestSubj ?? consoleDataTestSubj);

    const panelClassName = useMemo(() => {
      return classNames({
        'eui-displayInlineBlock': showAs === 'pending',
        // This class name (font-family-code) is a utility class defined in `Console.tsx`
        'font-family-code': true,
        [className || '_']: Boolean(className),
      });
    }, [className, showAs]);

    return (
      <EuiPanel
        hasShadow={false}
        paddingSize="none"
        borderRadius="none"
        color="transparent"
        className={panelClassName}
        data-test-subj={dataTestSubj ? dataTestSubj : getTestId('commandExecutionResult')}
      >
        {showAs === 'pending' ? (
          <EuiText size="s">
            <EuiTextColor color="subdued">
              {children ?? COMMAND_EXECUTION_RESULT_PENDING}
            </EuiTextColor>
          </EuiText>
        ) : (
          <>
            {showTitle && (
              <>
                <EuiText size="s">
                  <EuiTextColor color={showAs === 'success' ? 'success' : 'danger'}>
                    {title
                      ? title
                      : showAs === 'success'
                      ? COMMAND_EXECUTION_RESULT_SUCCESS_TITLE
                      : COMMAND_EXECUTION_RESULT_FAILURE_TITLE}
                  </EuiTextColor>
                </EuiText>
                <EuiSpacer size="s" />
              </>
            )}
            {children}
          </>
        )}
      </EuiPanel>
    );
  }
);
CommandExecutionResult.displayName = 'CommandExecutionResult';

export type CommandExecutionResultComponent = ComponentType<CommandExecutionResultProps>;
