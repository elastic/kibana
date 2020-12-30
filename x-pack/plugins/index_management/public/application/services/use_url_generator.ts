/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import {
  UrlGeneratorContract,
  UrlGeneratorId,
  UrlGeneratorStateMapping,
} from '../../../../../../src/plugins/share/public';
import { useAppContext } from '../app_context';

export const useUrlGenerator = ({
  urlGeneratorId,
  urlGeneratorState,
}: {
  urlGeneratorId: UrlGeneratorId;
  urlGeneratorState: UrlGeneratorStateMapping[UrlGeneratorId]['State'];
}) => {
  const { urlGenerators } = useAppContext();
  const [link, setLink] = useState<string>();
  useEffect(() => {
    const updateLink = async (): Promise<void> => {
      let urlGenerator: UrlGeneratorContract<any>;
      try {
        urlGenerator = urlGenerators.getUrlGenerator(urlGeneratorId);
        const url = await urlGenerator.createUrl(urlGeneratorState);
        setLink(url);
      } catch (e) {
        // do nothing
      }
    };

    updateLink();
  }, [urlGeneratorId, urlGeneratorState, urlGenerators]);
  return link;
};
