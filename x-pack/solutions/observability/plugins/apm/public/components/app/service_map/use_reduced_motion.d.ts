/**
 * Hook that detects and responds to user's reduced motion preferences.
 * Listens for changes to the prefers-reduced-motion media query.
 *
 * @returns Object containing:
 * - prefersReducedMotion: boolean indicating if reduced motion is preferred
 * - getAnimationDuration: function to get 0 or the provided duration based on preference
 */
export declare function useReducedMotion(): {
    prefersReducedMotion: boolean;
    getAnimationDuration: (duration: number) => number;
};
