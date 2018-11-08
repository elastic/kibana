/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */



import { openSans } from '../../../common/lib/fonts';
import { ElementFactory } from '../types';
import header from './header.png';

export const horizontalProgressBar: ElementFactory = () => ({
  name: 'horizontalProgressBar',
  displayName: 'Horizontal progress bar',
  help: 'Displays progress as a portion of a horizontal bar',
  width: 400,
  height: 30,
  image: header,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="horizontalBar" label={formatnumber 0%} font={font size=24 family="${
    openSans.value
  }" color="#000000" align=center}
| render`,
});
