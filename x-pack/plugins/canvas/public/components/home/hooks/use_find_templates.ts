/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import useMount from 'react-use/lib/useMount';

import { useWorkpadService } from '../../../services';
import { TemplateFindResponse } from '../../../services/workpad';

const emptyResponse = { templates: [] };

export const useFindTemplates = () => {
  const workpadService = useWorkpadService();
  return useCallback(async () => await workpadService.findTemplates(), [workpadService]);
};

export const useFindTemplatesOnMount = (): [boolean, TemplateFindResponse] => {
  const [isMounted, setIsMounted] = useState(false);
  const findTemplates = useFindTemplates();
  const [templateResponse, setTemplateResponse] = useState<TemplateFindResponse>(emptyResponse);

  const fetchTemplates = useCallback(async () => {
    const foundTemplates = await findTemplates();
    setTemplateResponse(foundTemplates || emptyResponse);
    setIsMounted(true);
  }, [findTemplates]);

  useMount(() => {
    fetchTemplates();
    return () => setIsMounted(false);
  });

  return [isMounted, templateResponse];
};
