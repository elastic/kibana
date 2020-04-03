/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { createAppRootMockRenderer } from '../../mocks';
import { PolicyDetails } from './policy_details';
import { EndpointDocGenerator } from '../../../../../common/generate_data';

describe('Policy Details', () => {
  const generator = new EndpointDocGenerator();
  const {
    history,
    AppWrapper,
    coreStart: { http },
  } = createAppRootMockRenderer();
  const render = (ui: Parameters<typeof mount>[0]) => mount(ui, { wrappingComponent: AppWrapper });
  let policyDatasource: ReturnType<typeof generator.generatePolicyDatasource>;
  let policyView: ReturnType<typeof render>;

  afterEach(() => {
    if (policyView) {
      policyView.unmount();
    }
  });

  describe('when displayed with invalid id', () => {
    beforeEach(() => {
      http.get.mockReturnValue(Promise.reject(new Error('policy not found')));
      history.push('/policy/1');
      policyView = render(<PolicyDetails />);
    });

    it('should show loader followed by error message', () => {
      expect(policyView.find('EuiLoadingSpinner').length).toBe(1);
      policyView.update();
      const callout = policyView.find('EuiCallOut');
      expect(callout).toHaveLength(1);
      expect(callout.prop('color')).toEqual('danger');
      expect(callout.text()).toEqual('policy not found');
    });
  });
  describe('when displayed with valid id', () => {
    beforeEach(() => {
      policyDatasource = generator.generatePolicyDatasource();
      http.get.mockResolvedValue({
        item: policyDatasource,
        success: true,
      });
      history.push('/policy/1');
      policyView = render(<PolicyDetails />);
    });

    it('should display back to list button and policy title', () => {
      policyView.update();
      const pageHeaderLeft = policyView.find(
        'EuiPageHeaderSection[data-test-subj="pageViewHeaderLeft"]'
      );

      const backToListButton = pageHeaderLeft.find('EuiButtonEmpty');
      expect(backToListButton.prop('iconType')).toBe('arrowLeft');
      expect(backToListButton.prop('href')).toBe('/mock/app/endpoint/policy');
      expect(backToListButton.text()).toBe('Back to policy list');

      const pageTitle = pageHeaderLeft.find('[data-test-subj="pageViewHeaderLeftTitle"]');
      expect(pageTitle).toHaveLength(1);
      expect(pageTitle.text()).toEqual(policyDatasource.name);
    });
    it('should display agent stats', () => {
      policyView.update();
      const headerRight = policyView.find(
        'EuiPageHeaderSection[data-test-subj="pageViewHeaderRight"]'
      );
      const agentsSummary = headerRight.find('[data-test-subj="policyAgentsSummary"]');
      expect(agentsSummary.length).toBe(1);
    });
    it.todo('should display cancel button');
    it.todo('should display save button');
    it.todo('should redirect to policy list when cancel button is clicked');
    it.todo('should navigate to list if back to link is clicked');
  });
  describe('when the save button is clicked', () => {
    it.todo('should show a modal confirmation');
    it.todo('should show info callout if policy is in use');
    it.todo('should hide dialog when save and deploy button is clicked');
    it.todo('should close dialog if cancel button is clicked');
    it.todo('should show a success notification toast if update succeeds');
    it.todo('should show an error notification toast if update fails');
  });
});
//
// `
//         .c2 .policyDetailTitleOS {
//           -webkit-box-flex: 2;
//           -webkit-flex-grow: 2;
//           -ms-flex-positive: 2;
//           flex-grow: 2;
//         }
//
//         .c2 .policyDetailTitleFlexItem {
//           margin: 0;
//         }
//
//         .c0.endpoint--isListView {
//           padding: 0;
//         }
//
//         .c0.endpoint--isListView .endpoint-header {
//           padding: 24px;
//         }
//
//         .c0.endpoint--isListView .endpoint-page-content {
//           border-left: none;
//           border-right: none;
//         }
//
//         .c0.endpoint--isDetailsView .endpoint-page-content {
//           padding: 0;
//           border: none;
//           background: none;
//         }
//
//         .c1 {
//           width: 0;
//           height: 100%;
//           border-left: 1px solid #d3dae6;
//           margin-left: 24px;
//           margin-right: 24px;
//         }
//
//         <Memo()>
//           <Memo()
//             data-test-subj="policyDetailsPage"
//             headerLeft={
//               <div>
//                 <EuiButtonEmpty
//                   contentProps={
//                     Object {
//                       "style": Object {
//                         "paddingLeft": "0",
//                       },
//                     }
//                   }
//                   href="/mock/app/endpoint/policy"
//                   iconType="arrowLeft"
//                   onClick={[Function]}
//                 >
//                   <FormattedMessage
//                     defaultMessage="Back to policy list"
//                     id="xpack.endpoint.policy.details.backToListTitle"
//                     values={Object {}}
//                   />
//                 </EuiButtonEmpty>
//                 <Memo>
//                   Endpoint Policy
//                 </Memo>
//               </div>
//             }
//             headerRight={
//               <ForwardRef
//                 gutterSize="s"
//                 justifyContent="flexEnd"
//               >
//                 <EuiFlexItem
//                   grow={false}
//                 >
//                   <Memo
//                     error={0}
//                     events={0}
//                     offline={0}
//                     online={0}
//                     total={0}
//                   />
//                 </EuiFlexItem>
//                 <EuiFlexItem>
//                   <ForwardRef(styled.div)
//                     spacing="l"
//                   />
//                 </EuiFlexItem>
//                 <EuiFlexItem
//                   grow={false}
//                 >
//                   <EuiButtonEmpty
//                     onClick={[Function]}
//                   >
//                     <FormattedMessage
//                       defaultMessage="Cancel"
//                       id="xpack.endpoint.policy.details.cancel"
//                       values={Object {}}
//                     />
//                   </EuiButtonEmpty>
//                 </EuiFlexItem>
//                 <EuiFlexItem
//                   grow={false}
//                 >
//                   <EuiButton
//                     fill={true}
//                     iconType="save"
//                     isLoading={false}
//                     onClick={[Function]}
//                   >
//                     <FormattedMessage
//                       defaultMessage="Save"
//                       id="xpack.endpoint.policy.details.save"
//                       values={Object {}}
//                     />
//                   </EuiButton>
//                 </EuiFlexItem>
//               </ForwardRef>
//             }
//             viewType="details"
//           >
//             <Styled(EuiPage)
//               className="endpoint--isDetailsView"
//               data-test-subj="policyDetailsPage"
//             >
//               <EuiPage
//                 className="c0 endpoint--isDetailsView"
//                 data-test-subj="policyDetailsPage"
//               >
//                 <div
//                   className="euiPage c0 endpoint--isDetailsView"
//                   data-test-subj="policyDetailsPage"
//                 >
//                   <EuiPageBody>
//                     <main
//                       className="euiPageBody"
//                     >
//                       <EuiPageHeader
//                         className="endpoint-header"
//                       >
//                         <div
//                           className="euiPageHeader euiPageHeader--responsive endpoint-header"
//                         >
//                           <EuiPageHeaderSection
//                             data-test-subj="pageViewHeaderLeft"
//                           >
//                             <div
//                               className="euiPageHeaderSection"
//                               data-test-subj="pageViewHeaderLeft"
//                             >
//                               <div>
//                                 <EuiButtonEmpty
//                                   contentProps={
//                                     Object {
//                                       "style": Object {
//                                         "paddingLeft": "0",
//                                       },
//                                     }
//                                   }
//                                   href="/mock/app/endpoint/policy"
//                                   iconType="arrowLeft"
//                                   onClick={[Function]}
//                                 >
//                                   <a
//                                     className="euiButtonEmpty euiButtonEmpty--primary"
//                                     href="/mock/app/endpoint/policy"
//                                     onClick={[Function]}
//                                     rel="noreferrer"
//                                   >
//                                     <span
//                                       className="euiButtonEmpty__content"
//                                       style={
//                                         Object {
//                                           "paddingLeft": "0",
//                                         }
//                                       }
//                                     >
//                                       <EuiIcon
//                                         aria-hidden="true"
//                                         className="euiButtonEmpty__icon"
//                                         size="m"
//                                         type="arrowLeft"
//                                       >
//                                         <div
//                                           aria-hidden="true"
//                                           className="euiButtonEmpty__icon"
//                                           data-euiicon-type="arrowLeft"
//                                           size="m"
//                                         />
//                                       </EuiIcon>
//                                       <span
//                                         className="euiButtonEmpty__text"
//                                       >
//                                         <FormattedMessage
//                                           defaultMessage="Back to policy list"
//                                           id="xpack.endpoint.policy.details.backToListTitle"
//                                           values={Object {}}
//                                         >
//                                           Back to policy list
//                                         </FormattedMessage>
//                                       </span>
//                                     </span>
//                                   </a>
//                                 </EuiButtonEmpty>
//                                 <Memo()>
//                                   <EuiTitle
//                                     size="l"
//                                   >
//                                     <h1
//                                       className="euiTitle euiTitle--large"
//                                       data-test-subj="pageViewHeaderLeftTitle"
//                                     >
//                                       Endpoint Policy
//                                     </h1>
//                                   </EuiTitle>
//                                 </Memo()>
//                               </div>
//                             </div>
//                           </EuiPageHeaderSection>
//                           <EuiPageHeaderSection
//                             data-test-subj="pageViewHeaderRight"
//                           >
//                             <div
//                               className="euiPageHeaderSection"
//                               data-test-subj="pageViewHeaderRight"
//                             >
//                               <EuiFlexGroup
//                                 gutterSize="s"
//                                 justifyContent="flexEnd"
//                               >
//                                 <div
//                                   className="euiFlexGroup euiFlexGroup--gutterSmall euiFlexGroup--justifyContentFlexEnd euiFlexGroup--directionRow euiFlexGroup--responsive"
//                                 >
//                                   <EuiFlexItem
//                                     grow={false}
//                                   >
//                                     <div
//                                       className="euiFlexItem euiFlexItem--flexGrowZero"
//                                     >
//                                       <Memo()
//                                         error={0}
//                                         events={0}
//                                         offline={0}
//                                         online={0}
//                                         total={0}
//                                       >
//                                         <EuiFlexGroup
//                                           data-test-subj="policyAgentsSummary"
//                                           gutterSize="xl"
//                                         >
//                                           <div
//                                             className="euiFlexGroup euiFlexGroup--gutterExtraLarge euiFlexGroup--directionRow euiFlexGroup--responsive"
//                                             data-test-subj="policyAgentsSummary"
//                                           >
//                                             <EuiFlexItem
//                                               grow={false}
//                                               key="total"
//                                             >
//                                               <div
//                                                 className="euiFlexItem euiFlexItem--flexGrowZero"
//                                               >
//                                                 <EuiDescriptionList
//                                                   align="center"
//                                                   listItems={
//                                                     Array [
//                                                       Object {
//                                                         "description": <React.Fragment>
//
//                                                           <EuiI18nNumber
//                                                             value={0}
//                                                           />
//                                                         </React.Fragment>,
//                                                         "title": "Hosts",
//                                                       },
//                                                     ]
//                                                   }
//                                                   textStyle="reverse"
//                                                 >
//                                                   <dl
//                                                     className="euiDescriptionList euiDescriptionList--row euiDescriptionList--center euiDescriptionList--reverse"
//                                                   >
//                                                     <EuiDescriptionListTitle
//                                                       key="title-0"
//                                                     >
//                                                       <dt
//                                                         className="euiDescriptionList__title"
//                                                       >
//                                                         Hosts
//                                                       </dt>
//                                                     </EuiDescriptionListTitle>
//                                                     <EuiDescriptionListDescription
//                                                       key="description-0"
//                                                     >
//                                                       <dd
//                                                         className="euiDescriptionList__description"
//                                                       >
//                                                         <EuiI18nNumber
//                                                           value={0}
//                                                         >
//                                                           0
//                                                         </EuiI18nNumber>
//                                                       </dd>
//                                                     </EuiDescriptionListDescription>
//                                                   </dl>
//                                                 </EuiDescriptionList>
//                                               </div>
//                                             </EuiFlexItem>
//                                             <EuiFlexItem
//                                               grow={false}
//                                               key="online"
//                                             >
//                                               <div
//                                                 className="euiFlexItem euiFlexItem--flexGrowZero"
//                                               >
//                                                 <EuiDescriptionList
//                                                   align="center"
//                                                   listItems={
//                                                     Array [
//                                                       Object {
//                                                         "description": <React.Fragment>
//                                                           <EuiHealth
//                                                             className="eui-alignMiddle"
//                                                             color="success"
//                                                           />
//                                                           <EuiI18nNumber
//                                                             value={0}
//                                                           />
//                                                         </React.Fragment>,
//                                                         "title": "Online",
//                                                       },
//                                                     ]
//                                                   }
//                                                   textStyle="reverse"
//                                                 >
//                                                   <dl
//                                                     className="euiDescriptionList euiDescriptionList--row euiDescriptionList--center euiDescriptionList--reverse"
//                                                   >
//                                                     <EuiDescriptionListTitle
//                                                       key="title-0"
//                                                     >
//                                                       <dt
//                                                         className="euiDescriptionList__title"
//                                                       >
//                                                         Online
//                                                       </dt>
//                                                     </EuiDescriptionListTitle>
//                                                     <EuiDescriptionListDescription
//                                                       key="description-0"
//                                                     >
//                                                       <dd
//                                                         className="euiDescriptionList__description"
//                                                       >
//                                                         <EuiHealth
//                                                           className="eui-alignMiddle"
//                                                           color="success"
//                                                         >
//                                                           <div
//                                                             className="euiHealth eui-alignMiddle"
//                                                           >
//                                                             <EuiFlexGroup
//                                                               alignItems="center"
//                                                               gutterSize="xs"
//                                                               responsive={false}
//                                                             >
//                                                               <div
//                                                                 className="euiFlexGroup euiFlexGroup--gutterExtraSmall euiFlexGroup--alignItemsCenter euiFlexGroup--directionRow"
//                                                               >
//                                                                 <EuiFlexItem
//                                                                   grow={false}
//                                                                 >
//                                                                   <div
//                                                                     className="euiFlexItem euiFlexItem--flexGrowZero"
//                                                                   >
//                                                                     <EuiIcon
//                                                                       color="success"
//                                                                       type="dot"
//                                                                     >
//                                                                       <div
//                                                                         color="success"
//                                                                         data-euiicon-type="dot"
//                                                                       />
//                                                                     </EuiIcon>
//                                                                   </div>
//                                                                 </EuiFlexItem>
//                                                                 <EuiFlexItem
//                                                                   grow={false}
//                                                                 >
//                                                                   <div
//                                                                     className="euiFlexItem euiFlexItem--flexGrowZero"
//                                                                   />
//                                                                 </EuiFlexItem>
//                                                               </div>
//                                                             </EuiFlexGroup>
//                                                           </div>
//                                                         </EuiHealth>
//                                                         <EuiI18nNumber
//                                                           value={0}
//                                                         >
//                                                           0
//                                                         </EuiI18nNumber>
//                                                       </dd>
//                                                     </EuiDescriptionListDescription>
//                                                   </dl>
//                                                 </EuiDescriptionList>
//                                               </div>
//                                             </EuiFlexItem>
//                                             <EuiFlexItem
//                                               grow={false}
//                                               key="offline"
//                                             >
//                                               <div
//                                                 className="euiFlexItem euiFlexItem--flexGrowZero"
//                                               >
//                                                 <EuiDescriptionList
//                                                   align="center"
//                                                   listItems={
//                                                     Array [
//                                                       Object {
//                                                         "description": <React.Fragment>
//                                                           <EuiHealth
//                                                             className="eui-alignMiddle"
//                                                             color="warning"
//                                                           />
//                                                           <EuiI18nNumber
//                                                             value={0}
//                                                           />
//                                                         </React.Fragment>,
//                                                         "title": "Offline",
//                                                       },
//                                                     ]
//                                                   }
//                                                   textStyle="reverse"
//                                                 >
//                                                   <dl
//                                                     className="euiDescriptionList euiDescriptionList--row euiDescriptionList--center euiDescriptionList--reverse"
//                                                   >
//                                                     <EuiDescriptionListTitle
//                                                       key="title-0"
//                                                     >
//                                                       <dt
//                                                         className="euiDescriptionList__title"
//                                                       >
//                                                         Offline
//                                                       </dt>
//                                                     </EuiDescriptionListTitle>
//                                                     <EuiDescriptionListDescription
//                                                       key="description-0"
//                                                     >
//                                                       <dd
//                                                         className="euiDescriptionList__description"
//                                                       >
//                                                         <EuiHealth
//                                                           className="eui-alignMiddle"
//                                                           color="warning"
//                                                         >
//                                                           <div
//                                                             className="euiHealth eui-alignMiddle"
//                                                           >
//                                                             <EuiFlexGroup
//                                                               alignItems="center"
//                                                               gutterSize="xs"
//                                                               responsive={false}
//                                                             >
//                                                               <div
//                                                                 className="euiFlexGroup euiFlexGroup--gutterExtraSmall euiFlexGroup--alignItemsCenter euiFlexGroup--directionRow"
//                                                               >
//                                                                 <EuiFlexItem
//                                                                   grow={false}
//                                                                 >
//                                                                   <div
//                                                                     className="euiFlexItem euiFlexItem--flexGrowZero"
//                                                                   >
//                                                                     <EuiIcon
//                                                                       color="warning"
//                                                                       type="dot"
//                                                                     >
//                                                                       <div
//                                                                         color="warning"
//                                                                         data-euiicon-type="dot"
//                                                                       />
//                                                                     </EuiIcon>
//                                                                   </div>
//                                                                 </EuiFlexItem>
//                                                                 <EuiFlexItem
//                                                                   grow={false}
//                                                                 >
//                                                                   <div
//                                                                     className="euiFlexItem euiFlexItem--flexGrowZero"
//                                                                   />
//                                                                 </EuiFlexItem>
//                                                               </div>
//                                                             </EuiFlexGroup>
//                                                           </div>
//                                                         </EuiHealth>
//                                                         <EuiI18nNumber
//                                                           value={0}
//                                                         >
//                                                           0
//                                                         </EuiI18nNumber>
//                                                       </dd>
//                                                     </EuiDescriptionListDescription>
//                                                   </dl>
//                                                 </EuiDescriptionList>
//                                               </div>
//                                             </EuiFlexItem>
//                                             <EuiFlexItem
//                                               grow={false}
//                                               key="error"
//                                             >
//                                               <div
//                                                 className="euiFlexItem euiFlexItem--flexGrowZero"
//                                               >
//                                                 <EuiDescriptionList
//                                                   align="center"
//                                                   listItems={
//                                                     Array [
//                                                       Object {
//                                                         "description": <React.Fragment>
//                                                           <EuiHealth
//                                                             className="eui-alignMiddle"
//                                                             color="danger"
//                                                           />
//                                                           <EuiI18nNumber
//                                                             value={0}
//                                                           />
//                                                         </React.Fragment>,
//                                                         "title": "Error",
//                                                       },
//                                                     ]
//                                                   }
//                                                   textStyle="reverse"
//                                                 >
//                                                   <dl
//                                                     className="euiDescriptionList euiDescriptionList--row euiDescriptionList--center euiDescriptionList--reverse"
//                                                   >
//                                                     <EuiDescriptionListTitle
//                                                       key="title-0"
//                                                     >
//                                                       <dt
//                                                         className="euiDescriptionList__title"
//                                                       >
//                                                         Error
//                                                       </dt>
//                                                     </EuiDescriptionListTitle>
//                                                     <EuiDescriptionListDescription
//                                                       key="description-0"
//                                                     >
//                                                       <dd
//                                                         className="euiDescriptionList__description"
//                                                       >
//                                                         <EuiHealth
//                                                           className="eui-alignMiddle"
//                                                           color="danger"
//                                                         >
//                                                           <div
//                                                             className="euiHealth eui-alignMiddle"
//                                                           >
//                                                             <EuiFlexGroup
//                                                               alignItems="center"
//                                                               gutterSize="xs"
//                                                               responsive={false}
//                                                             >
//                                                               <div
//                                                                 className="euiFlexGroup euiFlexGroup--gutterExtraSmall euiFlexGroup--alignItemsCenter euiFlexGroup--directionRow"
//                                                               >
//                                                                 <EuiFlexItem
//                                                                   grow={false}
//                                                                 >
//                                                                   <div
//                                                                     className="euiFlexItem euiFlexItem--flexGrowZero"
//                                                                   >
//                                                                     <EuiIcon
//                                                                       color="danger"
//                                                                       type="dot"
//                                                                     >
//                                                                       <div
//                                                                         color="danger"
//                                                                         data-euiicon-type="dot"
//                                                                       />
//                                                                     </EuiIcon>
//                                                                   </div>
//                                                                 </EuiFlexItem>
//                                                                 <EuiFlexItem
//                                                                   grow={false}
//                                                                 >
//                                                                   <div
//                                                                     className="euiFlexItem euiFlexItem--flexGrowZero"
//                                                                   />
//                                                                 </EuiFlexItem>
//                                                               </div>
//                                                             </EuiFlexGroup>
//                                                           </div>
//                                                         </EuiHealth>
//                                                         <EuiI18nNumber
//                                                           value={0}
//                                                         >
//                                                           0
//                                                         </EuiI18nNumber>
//                                                       </dd>
//                                                     </EuiDescriptionListDescription>
//                                                   </dl>
//                                                 </EuiDescriptionList>
//                                               </div>
//                                             </EuiFlexItem>
//                                           </div>
//                                         </EuiFlexGroup>
//                                       </Memo()>
//                                     </div>
//                                   </EuiFlexItem>
//                                   <EuiFlexItem>
//                                     <div
//                                       className="euiFlexItem"
//                                     >
//                                       <styled.div
//                                         spacing="l"
//                                       >
//                                         <div
//                                           className="c1"
//                                           spacing="l"
//                                         />
//                                       </styled.div>
//                                     </div>
//                                   </EuiFlexItem>
//                                   <EuiFlexItem
//                                     grow={false}
//                                   >
//                                     <div
//                                       className="euiFlexItem euiFlexItem--flexGrowZero"
//                                     >
//                                       <EuiButtonEmpty
//                                         onClick={[Function]}
//                                       >
//                                         <button
//                                           className="euiButtonEmpty euiButtonEmpty--primary"
//                                           onClick={[Function]}
//                                           type="button"
//                                         >
//                                           <span
//                                             className="euiButtonEmpty__content"
//                                           >
//                                             <span
//                                               className="euiButtonEmpty__text"
//                                             >
//                                               <FormattedMessage
//                                                 defaultMessage="Cancel"
//                                                 id="xpack.endpoint.policy.details.cancel"
//                                                 values={Object {}}
//                                               >
//                                                 Cancel
//                                               </FormattedMessage>
//                                             </span>
//                                           </span>
//                                         </button>
//                                       </EuiButtonEmpty>
//                                     </div>
//                                   </EuiFlexItem>
//                                   <EuiFlexItem
//                                     grow={false}
//                                   >
//                                     <div
//                                       className="euiFlexItem euiFlexItem--flexGrowZero"
//                                     >
//                                       <EuiButton
//                                         fill={true}
//                                         iconType="save"
//                                         isLoading={false}
//                                         onClick={[Function]}
//                                       >
//                                         <button
//                                           className="euiButton euiButton--primary euiButton--fill"
//                                           onClick={[Function]}
//                                           type="button"
//                                         >
//                                           <span
//                                             className="euiButton__content"
//                                           >
//                                             <EuiIcon
//                                               aria-hidden="true"
//                                               className="euiButton__icon"
//                                               size="m"
//                                               type="save"
//                                             >
//                                               <div
//                                                 aria-hidden="true"
//                                                 className="euiButton__icon"
//                                                 data-euiicon-type="save"
//                                                 size="m"
//                                               />
//                                             </EuiIcon>
//                                             <span
//                                               className="euiButton__text"
//                                             >
//                                               <FormattedMessage
//                                                 defaultMessage="Save"
//                                                 id="xpack.endpoint.policy.details.save"
//                                                 values={Object {}}
//                                               >
//                                                 Save
//                                               </FormattedMessage>
//                                             </span>
//                                           </span>
//                                         </button>
//                                       </EuiButton>
//                                     </div>
//                                   </EuiFlexItem>
//                                 </div>
//                               </EuiFlexGroup>
//                             </div>
//                           </EuiPageHeaderSection>
//                         </div>
//                       </EuiPageHeader>
//                       <EuiPageContent
//                         className="endpoint-page-content"
//                       >
//                         <EuiPanel
//                           className="euiPageContent endpoint-page-content"
//                           paddingSize="l"
//                         >
//                           <div
//                             className="euiPanel euiPanel--paddingLarge euiPageContent endpoint-page-content"
//                           >
//                             <EuiPageContentBody
//                               data-test-subj="pageViewBodyContent"
//                             >
//                               <div
//                                 className="euiPageContentBody"
//                                 data-test-subj="pageViewBodyContent"
//                               >
//                                 <EuiText
//                                   color="subdued"
//                                   size="xs"
//                                 >
//                                   <div
//                                     className="euiText euiText--extraSmall"
//                                   >
//                                     <EuiTextColor
//                                       color="subdued"
//                                       component="div"
//                                     >
//                                       <div
//                                         className="euiTextColor euiTextColor--subdued"
//                                       >
//                                         <h4>
//                                           <FormattedMessage
//                                             defaultMessage="Settings"
//                                             id="xpack.endpoint.policy.details.settings"
//                                             values={Object {}}
//                                           >
//                                             Settings
//                                           </FormattedMessage>
//                                         </h4>
//                                       </div>
//                                     </EuiTextColor>
//                                   </div>
//                                 </EuiText>
//                                 <EuiSpacer
//                                   size="xs"
//                                 >
//                                   <div
//                                     className="euiSpacer euiSpacer--xs"
//                                   />
//                                 </EuiSpacer>
//                                 <Memo()>
//                                   <Memo()
//                                     id="windowsEventingForm"
//                                     selectedEventing={2}
//                                     supportedOss={
//                                       Array [
//                                         "Windows",
//                                       ]
//                                     }
//                                     totalEventing={2}
//                                     type="Event Collection"
//                                   >
//                                     <styled.div>
//                                       <div
//                                         className="c2"
//                                       >
//                                         <EuiCard
//                                           data-test-subj="windowsEventingForm"
//                                           description=""
//                                           textAlign="left"
//                                           title={
//                                             <ForwardRef
//                                               alignItems="center"
//                                               direction="row"
//                                               gutterSize="none"
//                                             >
//                                               <ForwardRef
//                                                 direction="column"
//                                                 gutterSize="none"
//                                               >
//                                                 <EuiFlexItem
//                                                   className="policyDetailTitleFlexItem"
//                                                 >
//                                                   <EuiTitle
//                                                     size="xxxs"
//                                                   >
//                                                     <h6>
//                                                       <FormattedMessage
//                                                         defaultMessage="Type"
//                                                         id="xpack.endpoint.policyDetailType"
//                                                         values={Object {}}
//                                                       />
//                                                     </h6>
//                                                   </EuiTitle>
//                                                 </EuiFlexItem>
//                                                 <EuiFlexItem
//                                                   className="policyDetailTitleFlexItem"
//                                                 >
//                                                   <EuiText
//                                                     size="m"
//                                                   >
//                                                     Event Collection
//                                                   </EuiText>
//                                                 </EuiFlexItem>
//                                               </ForwardRef>
//                                               <ForwardRef
//                                                 className="policyDetailTitleOS"
//                                                 direction="column"
//                                                 gutterSize="none"
//                                               >
//                                                 <EuiFlexItem
//                                                   className="policyDetailTitleFlexItem"
//                                                 >
//                                                   <EuiTitle
//                                                     size="xxxs"
//                                                   >
//                                                     <h6>
//                                                       <FormattedMessage
//                                                         defaultMessage="Operating System"
//                                                         id="xpack.endpoint.policyDetailOS"
//                                                         values={Object {}}
//                                                       />
//                                                     </h6>
//                                                   </EuiTitle>
//                                                 </EuiFlexItem>
//                                                 <EuiFlexItem
//                                                   className="policyDetailTitleFlexItem"
//                                                 >
//                                                   <EuiText>
//                                                     Windows
//                                                   </EuiText>
//                                                 </EuiFlexItem>
//                                               </ForwardRef>
//                                               <EuiFlexItem
//                                                 grow={false}
//                                               >
//                                                 <EuiText
//                                                   color="subdued"
//                                                   size="s"
//                                                 >
//                                                   <FormattedMessage
//                                                     defaultMessage="{selectedEventing} / {totalEventing} event collections enabled"
//                                                     id="xpack.endpoint.policy.details.eventCollectionsEnabled"
//                                                     values={
//                                                       Object {
//                                                         "selectedEventing": 2,
//                                                         "totalEventing": 2,
//                                                       }
//                                                     }
//                                                   />
//                                                 </EuiText>
//                                               </EuiFlexItem>
//                                             </ForwardRef>
//                                           }
//                                         >
//                                           <div
//                                             className="euiCard euiCard--leftAligned euiCard--hasChildren"
//                                             data-test-subj="windowsEventingForm"
//                                             onClick={[Function]}
//                                           >
//                                             <div
//                                               className="euiCard__content"
//                                             >
//                                               <EuiTitle
//                                                 className="euiCard__title"
//                                                 id="plvem0a9Title"
//                                                 size="s"
//                                               >
//                                                 <span
//                                                   className="euiTitle euiTitle--small euiCard__title"
//                                                   id="plvem0a9Title"
//                                                 >
//                                                   <EuiFlexGroup
//                                                     alignItems="center"
//                                                     direction="row"
//                                                     gutterSize="none"
//                                                   >
//                                                     <div
//                                                       className="euiFlexGroup euiFlexGroup--alignItemsCenter euiFlexGroup--directionRow euiFlexGroup--responsive"
//                                                     >
//                                                       <EuiFlexGroup
//                                                         direction="column"
//                                                         gutterSize="none"
//                                                       >
//                                                         <div
//                                                           className="euiFlexGroup euiFlexGroup--directionColumn euiFlexGroup--responsive"
//                                                         >
//                                                           <EuiFlexItem
//                                                             className="policyDetailTitleFlexItem"
//                                                           >
//                                                             <div
//                                                               className="euiFlexItem policyDetailTitleFlexItem"
//                                                             >
//                                                               <EuiTitle
//                                                                 size="xxxs"
//                                                               >
//                                                                 <h6
//                                                                   className="euiTitle euiTitle--xxxsmall"
//                                                                 >
//                                                                   <FormattedMessage
//                                                                     defaultMessage="Type"
//                                                                     id="xpack.endpoint.policyDetailType"
//                                                                     values={Object {}}
//                                                                   >
//                                                                     Type
//                                                                   </FormattedMessage>
//                                                                 </h6>
//                                                               </EuiTitle>
//                                                             </div>
//                                                           </EuiFlexItem>
//                                                           <EuiFlexItem
//                                                             className="policyDetailTitleFlexItem"
//                                                           >
//                                                             <div
//                                                               className="euiFlexItem policyDetailTitleFlexItem"
//                                                             >
//                                                               <EuiText
//                                                                 size="m"
//                                                               >
//                                                                 <div
//                                                                   className="euiText euiText--medium"
//                                                                 >
//                                                                   Event Collection
//                                                                 </div>
//                                                               </EuiText>
//                                                             </div>
//                                                           </EuiFlexItem>
//                                                         </div>
//                                                       </EuiFlexGroup>
//                                                       <EuiFlexGroup
//                                                         className="policyDetailTitleOS"
//                                                         direction="column"
//                                                         gutterSize="none"
//                                                       >
//                                                         <div
//                                                           className="euiFlexGroup euiFlexGroup--directionColumn euiFlexGroup--responsive policyDetailTitleOS"
//                                                         >
//                                                           <EuiFlexItem
//                                                             className="policyDetailTitleFlexItem"
//                                                           >
//                                                             <div
//                                                               className="euiFlexItem policyDetailTitleFlexItem"
//                                                             >
//                                                               <EuiTitle
//                                                                 size="xxxs"
//                                                               >
//                                                                 <h6
//                                                                   className="euiTitle euiTitle--xxxsmall"
//                                                                 >
//                                                                   <FormattedMessage
//                                                                     defaultMessage="Operating System"
//                                                                     id="xpack.endpoint.policyDetailOS"
//                                                                     values={Object {}}
//                                                                   >
//                                                                     Operating System
//                                                                   </FormattedMessage>
//                                                                 </h6>
//                                                               </EuiTitle>
//                                                             </div>
//                                                           </EuiFlexItem>
//                                                           <EuiFlexItem
//                                                             className="policyDetailTitleFlexItem"
//                                                           >
//                                                             <div
//                                                               className="euiFlexItem policyDetailTitleFlexItem"
//                                                             >
//                                                               <EuiText>
//                                                                 <div
//                                                                   className="euiText euiText--medium"
//                                                                 >
//                                                                   Windows
//                                                                 </div>
//                                                               </EuiText>
//                                                             </div>
//                                                           </EuiFlexItem>
//                                                         </div>
//                                                       </EuiFlexGroup>
//                                                       <EuiFlexItem
//                                                         grow={false}
//                                                       >
//                                                         <div
//                                                           className="euiFlexItem euiFlexItem--flexGrowZero"
//                                                         >
//                                                           <EuiText
//                                                             color="subdued"
//                                                             size="s"
//                                                           >
//                                                             <div
//                                                               className="euiText euiText--small"
//                                                             >
//                                                               <EuiTextColor
//                                                                 color="subdued"
//                                                                 component="div"
//                                                               >
//                                                                 <div
//                                                                   className="euiTextColor euiTextColor--subdued"
//                                                                 >
//                                                                   <FormattedMessage
//                                                                     defaultMessage="{selectedEventing} / {totalEventing} event collections enabled"
//                                                                     id="xpack.endpoint.policy.details.eventCollectionsEnabled"
//                                                                     values={
//                                                                       Object {
//                                                                         "selectedEventing": 2,
//                                                                         "totalEventing": 2,
//                                                                       }
//                                                                     }
//                                                                   >
//                                                                     2 / 2 event collections enabled
//                                                                   </FormattedMessage>
//                                                                 </div>
//                                                               </EuiTextColor>
//                                                             </div>
//                                                           </EuiText>
//                                                         </div>
//                                                       </EuiFlexItem>
//                                                     </div>
//                                                   </EuiFlexGroup>
//                                                 </span>
//                                               </EuiTitle>
//                                               <EuiText
//                                                 className="euiCard__description"
//                                                 id="plvem0a9Description"
//                                                 size="s"
//                                               >
//                                                 <div
//                                                   className="euiText euiText--small euiCard__description"
//                                                   id="plvem0a9Description"
//                                                 >
//                                                   <p />
//                                                 </div>
//                                               </EuiText>
//                                               <EuiHorizontalRule
//                                                 margin="m"
//                                               >
//                                                 <hr
//                                                   className="euiHorizontalRule euiHorizontalRule--full euiHorizontalRule--marginMedium"
//                                                 />
//                                               </EuiHorizontalRule>
//                                               <EuiTitle
//                                                 size="xxs"
//                                               >
//                                                 <h5
//                                                   className="euiTitle euiTitle--xxsmall"
//                                                 >
//                                                   <FormattedMessage
//                                                     defaultMessage="Events"
//                                                     id="xpack.endpoint.policyDetailsConfig.eventingEvents"
//                                                     values={Object {}}
//                                                   >
//                                                     Events
//                                                   </FormattedMessage>
//                                                 </h5>
//                                               </EuiTitle>
//                                               <EuiSpacer
//                                                 size="s"
//                                               >
//                                                 <div
//                                                   className="euiSpacer euiSpacer--s"
//                                                 />
//                                               </EuiSpacer>
//                                               <Memo()
//                                                 id="eventingProcess"
//                                                 key="0"
//                                                 name="Process"
//                                                 os="windows"
//                                                 protectionField="process"
//                                               >
//                                                 <EuiCheckbox
//                                                   checked={true}
//                                                   compressed={false}
//                                                   disabled={false}
//                                                   id="eventingProcess"
//                                                   indeterminate={false}
//                                                   label="Process"
//                                                   onChange={[Function]}
//                                                 >
//                                                   <div
//                                                     className="euiCheckbox"
//                                                   >
//                                                     <input
//                                                       checked={true}
//                                                       className="euiCheckbox__input"
//                                                       disabled={false}
//                                                       id="eventingProcess"
//                                                       onChange={[Function]}
//                                                       type="checkbox"
//                                                     />
//                                                     <div
//                                                       className="euiCheckbox__square"
//                                                     />
//                                                     <label
//                                                       className="euiCheckbox__label"
//                                                       htmlFor="eventingProcess"
//                                                     >
//                                                       Process
//                                                     </label>
//                                                   </div>
//                                                 </EuiCheckbox>
//                                               </Memo()>
//                                               <Memo()
//                                                 id="eventingNetwork"
//                                                 key="1"
//                                                 name="Network"
//                                                 os="windows"
//                                                 protectionField="network"
//                                               >
//                                                 <EuiCheckbox
//                                                   checked={true}
//                                                   compressed={false}
//                                                   disabled={false}
//                                                   id="eventingNetwork"
//                                                   indeterminate={false}
//                                                   label="Network"
//                                                   onChange={[Function]}
//                                                 >
//                                                   <div
//                                                     className="euiCheckbox"
//                                                   >
//                                                     <input
//                                                       checked={true}
//                                                       className="euiCheckbox__input"
//                                                       disabled={false}
//                                                       id="eventingNetwork"
//                                                       onChange={[Function]}
//                                                       type="checkbox"
//                                                     />
//                                                     <div
//                                                       className="euiCheckbox__square"
//                                                     />
//                                                     <label
//                                                       className="euiCheckbox__label"
//                                                       htmlFor="eventingNetwork"
//                                                     >
//                                                       Network
//                                                     </label>
//                                                   </div>
//                                                 </EuiCheckbox>
//                                               </Memo()>
//                                             </div>
//                                           </div>
//                                         </EuiCard>
//                                       </div>
//                                     </styled.div>
//                                   </Memo()>
//                                 </Memo()>
//                               </div>
//                             </EuiPageContentBody>
//                           </div>
//                         </EuiPanel>
//                       </EuiPageContent>
//                     </main>
//                   </EuiPageBody>
//                 </div>
//               </EuiPage>
//             </Styled(EuiPage)>
//           </Memo()>
//         </Memo()>
//       `
