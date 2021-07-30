/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { UrlTemplate } from '../../types';

interface UrlTemplateButtonsProps {
  urlTemplates: UrlTemplate[];
  hasNodes: boolean;
  openUrlTemplate: (template: UrlTemplate) => void;
}

export const UrlTemplateButtons = ({
  hasNodes,
  urlTemplates,
  openUrlTemplate,
}: UrlTemplateButtonsProps) => {
  const emptyIconClassFilter = (curUrlTemplate: UrlTemplate) => curUrlTemplate.icon?.class === '';

  const filteredUrlTemplates = urlTemplates.filter(emptyIconClassFilter);

  if (filteredUrlTemplates.length > 0) {
    return (
      <div>
        {filteredUrlTemplates.map((cur) => {
          const onUrlTemplateClick = () => openUrlTemplate(cur);

          return (
            <EuiToolTip content={cur.description}>
              <button
                className="kuiButton kuiButton--basic kuiButton--small gphVertexSelect__button"
                type="button"
                disabled={hasNodes}
                onClick={onUrlTemplateClick}
              >
                <span className={`kuiIcon ${cur.icon?.class || ''}`} />
              </button>
            </EuiToolTip>
          );
        })}
      </div>
    );
  }

  return null;
};
