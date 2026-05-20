export declare function asMutableArray<T extends Readonly<any>>(arr: T): T extends Readonly<[...infer U]> ? U : unknown[];
