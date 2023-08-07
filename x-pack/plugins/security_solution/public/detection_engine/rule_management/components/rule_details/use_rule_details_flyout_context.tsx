/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// export interface RuleDetailsFlyoutContextType {
//   state: AddPrebuiltRulesTableState;
//   actions: AddPrebuiltRulesTableActions;
// }

// const RuleDetailsFlyoutContext = createContext<RuleDetailsFlyoutContextType | null>(null);

// interface RuleDetailsFlyoutContextProviderProps {
//   children: React.ReactNode;
// }

// export const RuleDetailsFlyoutContextProvider = ({
//   rules,
//   children,
// }: RuleDetailsFlyoutContextProviderProps) => {
//   const providerValue = useMemo<RuleDetailsFlyoutContextType>(() => {
//     const [flyoutRule, setFlyoutRule] = React.useState<RuleInstallationInfoForReview | null>(null);

//     const openFlyoutForRuleId = useCallback(
//       (ruleId: RuleSignatureId) => {
//         const ruleToShowInFlyout = rules.find((rule) => rule.rule_id === ruleId);
//         // invariant(rule, `Rule with id ${ruleId} not found`);
//         if (ruleToShowInFlyout) {
//           setFlyoutRule(ruleToShowInFlyout);
//         }
//       },
//       [rules, setFlyoutRule]
//     );

//     const closeFlyout = useCallback(() => {
//       setFlyoutRule(null);
//     }, []);

//     const actions = useMemo(
//       () => ({
//         openFlyoutForRuleId,
//         closeFlyout,
//       }),
//       [openFlyoutForRuleId, closeFlyout]
//     );

//     return {
//       state: {
//         flyoutRule,
//       },
//       actions,
//     };
//   }, []);

//   return (
//     <RuleDetailsFlyoutContext.Provider value={providerValue}>
//       {children}
//     </RuleDetailsFlyoutContext.Provider>
//   );
// };

// export const useRuleDetailsFlyoutContext = (rules): RuleDetailsFlyoutContextType => {
//   const rulesDetailsFlyoutContext = useContext(RuleDetailsFlyoutContext);
//   invariant(
//     rulesDetailsFlyoutContext,
//     'useAddPrebuiltRulesTableContext should be used inside AddPrebuiltRulesTableContextProvider'
//   );

//   return rulesDetailsFlyoutContext;
// };

// export const useAddPrebuiltRulesFlyoutContext = (): RuleDetailsFlyoutContextType => {
