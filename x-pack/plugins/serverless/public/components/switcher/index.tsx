/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  EuiPopover,
  useGeneratedHtmlId,
  EuiPopoverTitle,
  EuiTitle,
  EuiSpacer,
  EuiHeaderSectionItemButton,
} from '@elastic/eui';
import { HttpStart } from '@kbn/core-http-browser';
import { API_SWITCH_PROJECT } from '../../../common';
import { ProjectType } from '../../types';
import { Loader } from './loader';
import { SwitcherItem } from './item';

export const Switcher = ({ http }: { http: HttpStart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const id = useGeneratedHtmlId({
    prefix: 'switcherPopover',
  });

  const onButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const closePopover = () => {
    setIsOpen(false);
  };

  const handleSwitch = (project: ProjectType, e: React.MouseEvent) => {
    e.preventDefault();
    closePopover();
    http.post(API_SWITCH_PROJECT, { body: JSON.stringify({ id: project }) });
    ReactDOM.render(<Loader project={project} />, document.body);
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    return false;
  };

  const items = (
    <>
      <SwitcherItem
        key="observability"
        type="logoObservability"
        label="Observability"
        onClick={(e) => handleSwitch('oblt', e)}
      />
      <EuiSpacer size="xs" />
      <SwitcherItem
        key="elasticsearch"
        type="logoElasticsearch"
        label="Elasticsearch"
        onClick={(e) => handleSwitch('es', e)}
      />
      <EuiSpacer size="xs" />
      <SwitcherItem
        key="security"
        type="logoSecurity"
        label="Security"
        onClick={(e) => handleSwitch('security', e)}
      />
    </>
  );

  const button = (
    <EuiHeaderSectionItemButton
      iconType="wrench"
      aria-label="Developer Tools"
      onClick={onButtonClick}
    />
  );

  return (
    <EuiPopover
      {...{ id, button, isOpen, closePopover }}
      anchorPosition="downRight"
      repositionOnScroll
    >
      <EuiPopoverTitle>Developer Tools</EuiPopoverTitle>
      <EuiSpacer size="xs" />
      <EuiTitle size="xxs">
        <h3>Switch Project Type</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <div style={{ minWidth: 240 }}>{items}</div>
    </EuiPopover>
  );
};
