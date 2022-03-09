/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiPopover,
  EuiSelectable,
  EuiPopoverTitle,
  EuiPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SectionLoading } from '../../shared_imports';
import { ProcessTree } from '../process_tree';
import { Process, ProcessEvent } from '../../../common/types/process_tree';
import { SessionViewDetailPanel } from '../session_view_detail_panel';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { SessionViewDisplayOptions } from '../session_view_toggle_options';
import { useStyles } from './styles';
import { useFetchSessionViewProcessEvents } from './hooks';
import { i18n } from '@kbn/i18n';

interface SessionViewDeps {
  // the root node of the process tree to render. e.g process.entry.entity_id or process.session_leader.entity_id
  sessionEntityId: string;
  height?: number;
  jumpToEvent?: ProcessEvent;
}

interface optionsField {
  label: string;
  
  checked: 'on' | 'off' | undefined;
}

/**
 * The main wrapper component for the session view.
 */
export const SessionView = ({ sessionEntityId, height, jumpToEvent }: SessionViewDeps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const styles = useStyles({ height });

  const onProcessSelected = useCallback((process: Process) => {
    setSelectedProcess(process);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Process[] | null>(null);

  const [isOptionDropdownOpen, setOptionDropdownOpen] = useState(false);

  const [optionsStates, setOptionsStates] = useState({timeStamp: true, verboseMode: true})

  // const optionsList: optionsField[] = [
  //   {
  //     label: i18n.translate('xpack.sessionView.sessionViewToggle.sessionViewToggleOptions', {
  //         defaultMessage: 'Timestamp',
  //       }),
  //     checked: 'on',
  //   },
  //   {
  //     label: i18n.translate('xpack.sessionView.sessionViewToggle.sessionViewToggleOptions', {
  //         defaultMessage: 'Verbose mode',
  //       }),
  //     checked: 'on',
  //   },
  // ];
  // const [options, setOptions] = useState(optionsList);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    fetchPreviousPage,
    hasPreviousPage,
  } = useFetchSessionViewProcessEvents(sessionEntityId, jumpToEvent);

  const hasData = data && data.pages.length > 0 && data.pages[0].events.length > 0;
  const renderIsLoading = isFetching && !data;
  const renderDetails = isDetailOpen && selectedProcess;
  const toggleDetailPanel = () => {
    setIsDetailOpen(!isDetailOpen);
  };

  if (!isFetching && !hasData) {
    return (
      <EuiEmptyPrompt
        data-test-subj="sessionView:sessionViewProcessEventsEmpty"
        title={
          <h2>
            <FormattedMessage
              id="xpack.sessionView.emptyDataTitle"
              defaultMessage="No data to render"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.sessionView.emptyDataMessage"
              defaultMessage="No process events found for this query."
            />
          </p>
        }
      />
    );
  }

  // const renderOptionToggleDropDown = () => {
  //   return (
  //     <>
  //       <EuiPopover
  //         button={OptionButton}
  //         isOpen={isOptionDropdownOpen}
  //         closePopover={closeOptionButton}
  //       >
  //         <EuiSelectable
  //           options={options}
  //           onChange={(newOptions) => handleOptionChange(newOptions)}
  //         >
  //           {(list) => (
  //             <div style={{ width: 240 }}>
  //               <EuiPopoverTitle>Display options</EuiPopoverTitle>
  //               {list}
  //             </div>
  //           )}
  //         </EuiSelectable>
  //       </EuiPopover>
  //     </>
  //   );
  // };

  const handleOptionChange = (value) => {
    console.log(optionsStates)
    setOptionsStates(value);
  };

  const toggleOptionButton = () => {
    setOptionDropdownOpen(!isOptionDropdownOpen);
  };

  const closeOptionButton = () => {
    setOptionDropdownOpen(false);
  };

  const OptionButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="eye"
        display={isOptionDropdownOpen ? 'base' : 'empty'}
        onClick={toggleOptionButton}
        size="m"
        aria-label="Option"
        data-test-subj="sessionViewOptionButton"
      />
    </EuiFlexItem>
  );

  return (
    <>
      <EuiPanel color={'subdued'}>
        <EuiFlexGroup>
          <EuiFlexItem
            data-test-subj="sessionView:sessionViewProcessEventsSearch"
            css={styles.searchBar}
          >
            <SessionViewSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onProcessSelected={onProcessSelected}
              searchResults={searchResults}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false} css={styles.buttonsEyeDetail}>
            <SessionViewDisplayOptions optionsStates={optionsStates} onChange={handleOptionChange}/>
          </EuiFlexItem>

          <EuiFlexItem grow={false} css={styles.buttonsEyeDetail}>
            <EuiButton
              onClick={toggleDetailPanel}
              iconType="list"
              data-test-subj="sessionViewDetailPanelToggle"
            >
              <FormattedMessage
                id="xpack.sessionView.buttonOpenDetailPanel"
                defaultMessage="Detail panel"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiResizableContainer>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              initialSize={isDetailOpen ? 70 : 100}
              minSize="600px"
              paddingSize="none"
            >
              {renderIsLoading && (
                <SectionLoading>
                  <FormattedMessage
                    id="xpack.sessionView.loadingProcessTree"
                    defaultMessage="Loading session…"
                  />
                </SectionLoading>
              )}

              {error && (
                <EuiEmptyPrompt
                  iconType="alert"
                  color="danger"
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.sessionView.errorHeading"
                        defaultMessage="Error loading Session View"
                      />
                    </h2>
                  }
                  body={
                    <p>
                      <FormattedMessage
                        id="xpack.sessionView.errorMessage"
                        defaultMessage="There was an error loading the Session View."
                      />
                    </p>
                  }
                />
              )}

              {hasData && (
                <div css={styles.processTree}>
                  <ProcessTree
                    sessionEntityId={sessionEntityId}
                    data={data.pages}
                    searchQuery={searchQuery}
                    selectedProcess={selectedProcess}
                    onProcessSelected={onProcessSelected}
                    jumpToEvent={jumpToEvent}
                    isFetching={isFetching}
                    hasPreviousPage={hasPreviousPage}
                    hasNextPage={hasNextPage}
                    fetchNextPage={fetchNextPage}
                    fetchPreviousPage={fetchPreviousPage}
                    setSearchResults={setSearchResults}
                    // timeStampOn={options[0].checked === 'on'}
                    // verboseModeOn={options[1].checked === 'on'}
                    timeStampOn={optionsStates.timeStamp}
                    verboseModeOn={optionsStates.verboseMode}

                  />
                </div>
              )}
            </EuiResizablePanel>

            {renderDetails ? (
              <>
                <EuiResizableButton />
                <EuiResizablePanel
                  id="session-detail-panel"
                  initialSize={30}
                  minSize="200px"
                  paddingSize="none"
                  css={styles.detailPanel}
                >
                  <SessionViewDetailPanel
                    selectedProcess={selectedProcess}
                    onProcessSelected={onProcessSelected}
                  />
                </EuiResizablePanel>
              </>
            ) : (
              <>
                {/* Returning an empty element here (instead of false) to avoid a bug in EuiResizableContainer */}
              </>
            )}
          </>
        )}
      </EuiResizableContainer>
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export { SessionView as default };
