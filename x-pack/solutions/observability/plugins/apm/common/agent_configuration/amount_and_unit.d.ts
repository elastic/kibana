export interface AmountAndUnit {
    amount: number;
    unit: string;
}
export declare function amountAndUnitToObject(value: string): AmountAndUnit;
export declare function amountAndUnitToString({ amount, unit, }: Omit<AmountAndUnit, 'amount'> & {
    amount: string | number;
}): string;
