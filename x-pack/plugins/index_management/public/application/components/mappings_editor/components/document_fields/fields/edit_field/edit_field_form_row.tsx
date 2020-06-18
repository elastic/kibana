/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSwitch,
  EuiSpacer,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';

import {
  ToggleField,
  UseField,
  FormDataProvider,
  useFormContext,
} from '../../../../shared_imports';

import { ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';

type ChildrenFunc = (isOn: boolean) => React.ReactNode;

interface DocLink {
  text: string;
  href: string;
}

interface Props {
  title: string;
  description?: string | JSX.Element;
  docLink?: DocLink;
  defaultToggleValue?: boolean;
  formFieldPath?: ParameterName;
  children?: React.ReactNode | ChildrenFunc;
  withToggle?: boolean;
  configPath?: ParameterName;
  'data-test-subj'?: string;
}

export const EditFieldFormRow = React.memo(
  ({
    title,
    description,
    docLink,
    defaultToggleValue,
    formFieldPath,
    children,
    withToggle = true,
    configPath,
    'data-test-subj': dataTestSubj,
  }: Props) => {
    const form = useFormContext();

    const initialVisibleState =
      withToggle === false
        ? true
        : defaultToggleValue !== undefined
        ? defaultToggleValue
        : formFieldPath !== undefined
        ? (getFieldConfig(configPath ? configPath : formFieldPath).defaultValue! as boolean)
        : false;

    const [isContentVisible, setIsContentVisible] = useState<boolean>(initialVisibleState);

    const isChildrenFunction = typeof children === 'function';

    const onToggle = () => {
      if (isContentVisible === true) {
        /**
         * We are hiding the children (and thus removing any form field from the DOM).
         * We need to reset the form to re-enable a possible disabled "save" button (from a previous validation error).
         */
        form.reset({ resetValues: false });
      }
      setIsContentVisible(!isContentVisible);
    };

    const renderToggleInput = () =>
      formFieldPath === undefined ? (
        <EuiSwitch
          label={title}
          checked={isContentVisible}
          onChange={onToggle}
          data-test-subj="formRowToggle"
          showLabel={false}
        />
      ) : (
        <UseField
          path={formFieldPath}
          config={{
            ...getFieldConfig(configPath ? configPath : formFieldPath),
            defaultValue: initialVisibleState,
          }}
        >
          {(field) => {
            return (
              <ToggleField
                field={field}
                data-test-subj="abc"
                euiFieldProps={{
                  label: title,
                  showLabel: false,
                  'data-test-subj': 'formRowToggle',
                }}
              />
            );
          }}
        </UseField>
      );

    const renderContent = () => {
      const toggle = withToggle && (
        <EuiFlexItem grow={false} className="mappingsEditor__editFieldFormRow__toggle">
          {renderToggleInput()}
        </EuiFlexItem>
      );

      const controlsTitle = (
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      );

      const controlsDescription = description && (
        <EuiText
          size="s"
          color="subdued"
          className="mappingsEditor__editField__formRow__description"
        >
          {description}
        </EuiText>
      );

      const controlsHeader = (controlsTitle || controlsDescription) && (
        <div
          style={{
            paddingLeft: withToggle === false ? '0' : undefined,
          }}
        >
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>{controlsTitle}</EuiFlexItem>

            {docLink ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={docLink.text}>
                  <EuiButtonIcon
                    href={docLink.href}
                    target="_blank"
                    iconType="help"
                    aria-label={docLink.text}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          {controlsDescription}
        </div>
      );

      const controls = ((isContentVisible && children !== undefined) || isChildrenFunction) && (
        <div
          style={{
            paddingLeft: withToggle === false ? '0' : undefined,
          }}
        >
          <EuiSpacer size="m" />
          {isChildrenFunction ? (children as ChildrenFunc)(isContentVisible) : children}
        </div>
      );

      return (
        <EuiFlexGroup className="mappingsEditor__editField__formRow" data-test-subj={dataTestSubj}>
          {toggle}

          <EuiFlexItem>
            <div>
              {controlsHeader}
              {controls}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return formFieldPath ? (
      <FormDataProvider pathsToWatch={formFieldPath}>
        {(formData) => {
          setIsContentVisible(formData[formFieldPath]);
          return renderContent();
        }}
      </FormDataProvider>
    ) : (
      renderContent()
    );
  }
);
