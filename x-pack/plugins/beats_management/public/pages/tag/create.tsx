/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { ConfigurationBlock } from '../../../common/domain_types';
import { TagCreateConfig, TagEdit } from '../../components/tag';
import { FrontendLibs } from '../../lib/lib';

interface CreateTagPageProps {
  libs: FrontendLibs;
}

interface CreateTagPageState {
  color: string | null;
  configurationBlocks: ConfigurationBlock[];
  showFlyout: boolean;
  tagName: string | null;
}

export class CreateTagPage extends React.PureComponent<CreateTagPageProps, CreateTagPageState> {
  constructor(props: CreateTagPageProps) {
    super(props);

    this.state = {
      color: '#DD0A73',
      configurationBlocks: [],
      showFlyout: false,
      tagName: null,
    };
  }

  public render() {
    return <TagEdit config={TagCreateConfig} items={[]} />;
  }
}
