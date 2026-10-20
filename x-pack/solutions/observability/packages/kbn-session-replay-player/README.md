# @kbn/session-replay-player

Browser-only player for rrweb session recordings. The host application supplies the recording and
the surrounding page; this package renders playback, the timeline and the unavailable states.

Exported components load lazily: importing the package does not pull rrweb or the player into a
consumer's bundle until a component renders inside a `Suspense` boundary.
