export declare function useStateDebounced<T>(initialValue: T, debounceDelay?: number): readonly [T, import("lodash").DebouncedFunc<import("react").Dispatch<import("react").SetStateAction<T>>>];
