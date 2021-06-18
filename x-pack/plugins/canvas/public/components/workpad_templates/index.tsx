/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, FunctionComponent } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

import { ComponentStrings } from '../../../i18n/components';
// @ts-expect-error
import * as workpadService from '../../lib/workpad_service';
import { WorkpadTemplates as Component } from './workpad_templates';
import { CanvasTemplate } from '../../../types';
import { list } from '../../lib/template_service';
import { applyTemplateStrings } from '../../../i18n/templates/apply_strings';
import { useNotifyService, useServices } from '../../services';

interface WorkpadTemplatesProps {
  onClose: () => void;
}

const Creating: FunctionComponent<{ name: string }> = ({ name }) => (
  <div>
    <EuiLoadingSpinner size="l" />{' '}
    {ComponentStrings.WorkpadTemplates.getCreatingTemplateLabel(name)}
  </div>
);
export const WorkpadTemplates: FunctionComponent<WorkpadTemplatesProps> = ({ onClose }) => {
  const history = useHistory();
  const services = useServices();

  const [templates, setTemplates] = useState<CanvasTemplate[] | undefined>(undefined);
  const [creatingFromTemplateName, setCreatingFromTemplateName] = useState<string | undefined>(
    undefined
  );
  const { error } = useNotifyService();

  useEffect(() => {
    if (!templates) {
      (async () => {
        const fetchedTemplates = await list();
        setTemplates(applyTemplateStrings(fetchedTemplates));
      })();
    }
  }, [templates]);

  let templateProp: Record<string, CanvasTemplate> = {};

  if (templates) {
    templateProp = templates.reduce<Record<string, any>>((reduction, template) => {
      reduction[template.name] = template;
      return reduction;
    }, {});
  }

  const createFromTemplate = useCallback(
    async (template: CanvasTemplate) => {
      setCreatingFromTemplateName(template.name);
      try {
        const result = await services.workpad.createFromTemplate(template.id);
        history.push(`/workpad/${result.id}/page/1`);
      } catch (e) {
        setCreatingFromTemplateName(undefined);
        error(e, {
          title: `Couldn't create workpad from template`,
        });
      }
    },
    [services.workpad, error, history]
  );

  if (creatingFromTemplateName) {
    return <Creating name={creatingFromTemplateName} />;
  }

  return (
    <Component
      onClose={onClose}
      templates={templateProp}
      onCreateFromTemplate={createFromTemplate}
    />
  );
};
