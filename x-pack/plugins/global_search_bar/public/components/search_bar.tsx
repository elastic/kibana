/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiSelectable,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';

export function SearchBar(globalSearch: any) {
  const [isSearchFocused, setSearchFocus] = useState(false);
  // console.log(globalSearch);
  // globalSearch.find('discover').subscribe({
  //   next: ({ results }) => {
  //     console.log(results);
  //   },
  // });
  return (
    <EuiSelectable
      searchable
      height={300}
      singleSelection={true}
      searchProps={{
        'data-test-subj': 'header-search',
        onFocus: () => {
          setSearchFocus(true);
        },
        onBlur: () => setSearchFocus(false),
        placeholder: 'Search for anything...',
        incremental: true,
        compressed: true,
        onSearch: (/* term */) => {
          // console.log(globalSearch.find(term));
        },
      }}
      listProps={{
        rowHeight: 68,
      }}
      options={[
        { label: 'hello' },
        { label: 'two' },
        // { label: 'three' },
        // { label: 'hello' },
        // { label: 'two' },
        // { label: 'three' },
      ]}
      // onChange={(str) => {
      //   console.log(str);
      //   // call global search API
      //   // export class GlobalSearchProvidersPlugin  implements Plugin<{}, {}, {}, GlobalSearchProvidersPluginStartDeps> {  setup(    { getStartServices }: CoreSetup<{}, {}>,    { globalSearch }: GlobalSearchProvidersPluginSetupDeps  ) {    return {};  }  start(core, { globalSearch }: GlobalSearchProvidersPluginStartDeps) {    globalSearch.find('term')    return {};  }}
      // }}
    >
      {(list, search) => (
        <>
          <EuiPopover
            button={search}
            isOpen={isSearchFocused}
            closePopover={() => setSearchFocus(false)}
            panelPaddingSize={'none'}
            hasArrow={false}
          >
            <div style={{ width: '600px' }}>{list}</div>
            <EuiPopoverFooter>
              <EuiText className="kibanaChromeSearch__popoverFooter" size="xs">
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem />
                  <EuiFlexItem grow={false}>Quickly search using</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {/* TODO this is for mac only */}
                    <EuiBadge>Command + K</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiText>
            </EuiPopoverFooter>
          </EuiPopover>
        </>
      )}
    </EuiSelectable>
  );
}
